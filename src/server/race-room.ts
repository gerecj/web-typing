import { DurableObject } from "cloudflare:workers";
import {
	type ClientMessage,
	encodeServerMessage,
	PROTOCOL_VERSION,
	parseClientMessage,
	type ServerMessage,
} from "../lib/race/protocol";
import { getNextRoomDeadline } from "./deadlines";
import { generateRacePassage } from "./passage-service";
import {
	createRoomState,
	type RoomPlayer,
	type RoomRound,
	type RoomState,
	toRoomSnapshot,
} from "./room-state";
import {
	type RoomEffect,
	type RoomEvent,
	type TransitionResult,
	transitionRoom,
} from "./state-machine";

const ROOM_STORAGE_KEY = "room";
const ROOM_LIFETIME_MS = 2 * 60 * 60 * 1_000;
const COUNTDOWN_MS = 3_000;
const RACE_DEADLINE_MS = 3 * 60 * 1_000;
const MAX_MESSAGE_BYTES = 4_096;
const PROGRESS_PERSIST_INTERVAL_MS = 1_000;

interface SocketAttachment {
	playerId: string | null;
}

function jsonError(status: number, message: string): Response {
	return Response.json({ error: message }, { status });
}

function errorMessage(code: string): string {
	switch (code) {
		case "lobby_full":
			return "This lobby already has six players.";
		case "not_host":
			return "Only the lobby host can do that.";
		case "not_ready":
			return "Every connected player must be ready first.";
		case "invalid_phase":
			return "That action is not available right now.";
		case "invalid_round":
			return "That message belongs to a different race.";
		case "invalid_progress":
			return "The reported race progress is invalid.";
		default:
			return "The room could not process that action.";
	}
}

export class RaceRoom extends DurableObject<Env> {
	private room: RoomState | null = null;
	private scheduledAlarm: number | null = null;
	private lastProgressPersistAt = 0;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			this.room = (await ctx.storage.get<RoomState>(ROOM_STORAGE_KEY)) ?? null;
			this.scheduledAlarm = await ctx.storage.getAlarm();
		});
	}

	/** Returns false when a lobby with this code already exists. */
	async initialize(code: string): Promise<boolean> {
		if (this.room) return false;
		const now = Date.now();
		this.room = createRoomState(code, now, now + ROOM_LIFETIME_MS);
		await this.persistAndSchedule(now);
		return true;
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
			return jsonError(426, "A WebSocket upgrade is required");
		}
		if (!this.room) return jsonError(404, "Lobby not found");

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		this.ctx.acceptWebSocket(server);
		server.serializeAttachment({ playerId: null } satisfies SocketAttachment);
		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(socket: WebSocket, rawMessage: string | ArrayBuffer) {
		if (!this.room) {
			this.sendError(socket, "not_found", "Lobby not found.");
			return;
		}
		if (typeof rawMessage !== "string" || rawMessage.length > MAX_MESSAGE_BYTES) {
			this.sendError(socket, "invalid_message", "The message was not valid.");
			return;
		}

		let decoded: unknown;
		try {
			decoded = JSON.parse(rawMessage);
		} catch {
			this.sendError(socket, "invalid_message", "The message was not valid JSON.");
			return;
		}
		const message = parseClientMessage(decoded);
		if (!message) {
			this.sendError(socket, "invalid_message", "The message did not match the protocol.");
			return;
		}

		const attachment = socket.deserializeAttachment() as SocketAttachment | null;
		if (message.type === "join") {
			await this.handleJoin(socket, attachment, message);
			return;
		}
		if (!attachment?.playerId) {
			this.sendError(socket, "join_required", "Join the lobby before sending race messages.");
			return;
		}

		await this.handlePlayerMessage(socket, attachment.playerId, message);
	}

	async webSocketClose(socket: WebSocket) {
		await this.disconnectSocket(socket);
	}

	async webSocketError(socket: WebSocket) {
		await this.disconnectSocket(socket);
	}

	async alarm() {
		this.scheduledAlarm = null;
		if (!this.room) return;
		const now = Date.now();
		const result = transitionRoom(this.room, { type: "advance_time", now });
		await this.applyTransition(result, now, true, false);
	}

	private async handleJoin(
		socket: WebSocket,
		attachment: SocketAttachment | null,
		message: Extract<ClientMessage, { type: "join" }>,
	) {
		if (!this.room) return;
		if (attachment?.playerId) {
			this.sendError(socket, "already_joined", "This connection already joined the lobby.");
			return;
		}

		const now = Date.now();
		const playerId = crypto.randomUUID();
		const player: RoomPlayer = {
			id: playerId,
			name: message.name,
			connected: true,
			ready: false,
			repeatReady: false,
			charIndex: 0,
			totalInputs: 0,
			correctInputs: 0,
			correctCharacters: 0,
			place: null,
			wpm: null,
			accuracy: null,
			finishedAt: null,
			didNotFinish: false,
		};
		const transition = transitionRoom(this.room, { type: "join", player, now });

		if (transition.error) {
			const message =
				transition.error === "invalid_phase"
					? "This lobby is already racing. Try again when the race ends."
					: errorMessage(transition.error);
			this.sendError(socket, transition.error, message);
			socket.close(4003, "Lobby join rejected");
			return;
		}
		this.room = transition.state;
		this.touch(now);
		socket.serializeAttachment({ playerId } satisfies SocketAttachment);
		await this.persistAndSchedule(now);
		this.send(socket, {
			v: PROTOCOL_VERSION,
			type: "welcome",
			playerId,
			serverNow: now,
			room: toRoomSnapshot(this.room),
		});
		this.broadcastSnapshot();
	}

	private async handlePlayerMessage(
		socket: WebSocket,
		playerId: string,
		message: Exclude<ClientMessage, { type: "join" }>,
	) {
		if (!this.room) return;
		const now = Date.now();

		if (message.type === "ping") {
			this.send(socket, {
				v: PROTOCOL_VERSION,
				type: "pong",
				clientSentAt: message.clientSentAt,
				serverNow: now,
			});
			return;
		}

		let event: RoomEvent;
		switch (message.type) {
			case "set_ready":
				event = { type: "set_ready", playerId, ready: message.ready, now };
				break;
			case "set_settings":
				event = { type: "set_settings", playerId, settings: message.settings, now };
				break;
			case "progress":
			case "finish":
				event = {
					type: message.type,
					playerId,
					roundId: message.roundId,
					charIndex: message.charIndex,
					totalInputs: message.totalInputs,
					correctInputs: message.correctInputs,
					correctCharacters: message.correctCharacters,
					now,
				};
				break;
			case "set_repeat":
				event = { type: "set_repeat", playerId, ready: message.ready, now };
				break;
		}

		const result = transitionRoom(this.room, event);
		if (result.error) {
			this.sendError(socket, result.error, errorMessage(result.error));
			return;
		}
		const shouldPersist =
			message.type !== "progress" ||
			now - this.lastProgressPersistAt >= PROGRESS_PERSIST_INTERVAL_MS;
		await this.applyTransition(result, now, shouldPersist, true);
		if (shouldPersist && message.type === "progress") this.lastProgressPersistAt = now;
	}

	private async beginRound(now: number) {
		if (!this.room) return;
		let text: string;
		try {
			text = await generateRacePassage(this.env, this.room.settings);
		} catch {
			for (const socket of this.ctx.getWebSockets()) {
				this.sendError(socket, "passage_unavailable", "The race text could not be loaded.");
			}
			return;
		}

		const round: RoomRound = {
			id: crypto.randomUUID(),
			text,
			startsAt: now + COUNTDOWN_MS,
			deadlineAt: now + COUNTDOWN_MS + RACE_DEADLINE_MS,
		};
		const result = transitionRoom(this.room, {
			type: "start_round",
			round,
			now,
		});
		if (result.error) {
			for (const socket of this.ctx.getWebSockets()) {
				this.sendError(socket, result.error, errorMessage(result.error));
			}
			return;
		}
		await this.applyTransition(result, now, true, true);
	}

	private async disconnectSocket(socket: WebSocket) {
		if (!this.room) return;
		const attachment = socket.deserializeAttachment() as SocketAttachment | null;
		if (!attachment?.playerId) return;

		const now = Date.now();
		const result = transitionRoom(this.room, {
			type: "disconnect",
			playerId: attachment.playerId,
			now,
		});
		if (!result.error) await this.applyTransition(result, now, true, false);
	}

	private async applyTransition(
		result: TransitionResult,
		now: number,
		persist: boolean,
		extendExpiry: boolean,
	) {
		if (!this.room || result.error) return;
		this.room = result.state;
		if (extendExpiry) this.touch(now);
		if (result.effects.some((effect) => effect.type === "room_expired")) {
			await this.expireRoom();
			return;
		}
		if (persist) await this.persistAndSchedule(now);

		let requestRound = false;
		for (const effect of result.effects) {
			requestRound ||= effect.type === "round_requested";
			this.emitEffect(effect);
		}
		if (requestRound) await this.beginRound(now);
	}

	private emitEffect(effect: RoomEffect) {
		if (!this.room) return;
		switch (effect.type) {
			case "snapshot_changed":
			case "round_finished":
				this.broadcastSnapshot();
				break;
			case "race_started":
				this.broadcast({
					v: PROTOCOL_VERSION,
					type: "race_start",
					roundId: effect.round.id,
					text: effect.round.text,
					startsAt: effect.round.startsAt,
					deadlineAt: effect.round.deadlineAt,
					settings: this.room.settings,
				});
				break;
			case "progress_changed":
				this.broadcast({
					v: PROTOCOL_VERSION,
					type: "player_progress",
					roundId: effect.roundId,
					playerId: effect.playerId,
					charIndex: effect.charIndex,
					correctCharacters: effect.correctCharacters,
					wpm: effect.wpm,
				});
				break;
			case "player_finished":
				this.broadcast({
					v: PROTOCOL_VERSION,
					type: "player_finished",
					roundId: effect.roundId,
					playerId: effect.playerId,
					charIndex: effect.charIndex,
					correctCharacters: effect.correctCharacters,
					place: effect.place,
					wpm: effect.wpm,
					accuracy: effect.accuracy,
				});
				break;
			case "round_requested":
				break;
			case "room_expired":
				break;
		}
	}

	private touch(now: number) {
		if (!this.room) return;
		this.room.updatedAt = now;
		this.room.expiresAt = now + ROOM_LIFETIME_MS;
	}

	private async persistAndSchedule(now: number) {
		if (!this.room) return;
		await this.ctx.storage.put(ROOM_STORAGE_KEY, this.room);
		const nextAlarm = getNextRoomDeadline(this.room, now);
		if (nextAlarm === this.scheduledAlarm) return;
		if (nextAlarm === null) {
			await this.ctx.storage.deleteAlarm();
		} else {
			await this.ctx.storage.setAlarm(nextAlarm);
		}
		this.scheduledAlarm = nextAlarm;
	}

	private send(socket: WebSocket, message: ServerMessage) {
		try {
			socket.send(encodeServerMessage(message));
		} catch {
			// The close handler will reconcile presence.
		}
	}

	private sendError(socket: WebSocket, code: string, message: string) {
		this.send(socket, { v: PROTOCOL_VERSION, type: "error", code, message });
	}

	private broadcast(message: ServerMessage) {
		for (const socket of this.ctx.getWebSockets()) {
			const attachment = socket.deserializeAttachment() as SocketAttachment | null;
			if (attachment?.playerId) this.send(socket, message);
		}
	}

	private broadcastSnapshot() {
		if (!this.room) return;
		this.broadcast({
			v: PROTOCOL_VERSION,
			type: "snapshot",
			room: toRoomSnapshot(this.room),
		});
	}

	private async expireRoom() {
		for (const socket of this.ctx.getWebSockets()) socket.close(1000, "Lobby expired");
		await this.ctx.storage.deleteAlarm();
		await this.ctx.storage.deleteAll();
		this.room = null;
		this.scheduledAlarm = null;
	}
}
