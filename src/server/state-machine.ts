import type { RaceSettings } from "../lib/race/protocol";
import { calculateAccuracy, calculateWPMFromCorrectCharacters } from "../lib/typing-metrics";
import {
	MAX_RACE_PLAYERS,
	MIN_RACE_PLAYERS,
	type RoomPlayer,
	type RoomRound,
	type RoomState,
} from "./room-state";

export type RoomEvent =
	| { type: "join"; player: RoomPlayer; now: number }
	| { type: "disconnect"; playerId: string; now: number }
	| { type: "set_ready"; playerId: string; ready: boolean; now: number }
	| { type: "set_settings"; playerId: string; settings: RaceSettings; now: number }
	| {
			type: "start_round";
			round: RoomRound;
			now: number;
	  }
	| {
			type: "progress";
			playerId: string;
			roundId: string;
			charIndex: number;
			totalInputs: number;
			correctInputs: number;
			correctCharacters: number;
			now: number;
	  }
	| {
			type: "finish";
			playerId: string;
			roundId: string;
			charIndex: number;
			totalInputs: number;
			correctInputs: number;
			correctCharacters: number;
			now: number;
	  }
	| { type: "set_repeat"; playerId: string; ready: boolean; now: number }
	| { type: "advance_time"; now: number };

export type RoomEffect =
	| { type: "snapshot_changed" }
	| { type: "race_started"; round: RoomRound }
	| {
			type: "progress_changed";
			playerId: string;
			roundId: string;
			charIndex: number;
			correctCharacters: number;
			wpm: number;
	  }
	| {
			type: "player_finished";
			playerId: string;
			roundId: string;
			charIndex: number;
			correctCharacters: number;
			place: number;
			wpm: number;
			accuracy: number;
	  }
	| { type: "round_finished"; roundId: string }
	| { type: "round_requested" }
	| { type: "room_expired" };

export type RoomErrorCode =
	| "already_joined"
	| "invalid_phase"
	| "lobby_full"
	| "not_found"
	| "not_host"
	| "not_ready"
	| "invalid_round"
	| "invalid_progress";

export interface TransitionResult {
	state: RoomState;
	effects: RoomEffect[];
	error?: RoomErrorCode;
}

function reject(state: RoomState, error: RoomErrorCode): TransitionResult {
	return { state, effects: [], error };
}

function connectedPlayers(state: RoomState): RoomPlayer[] {
	return Object.values(state.players).filter((player) => player.connected);
}

function allConnectedRepeatReady(state: RoomState): boolean {
	const players = connectedPlayers(state);
	return players.length >= MIN_RACE_PLAYERS && players.every((player) => player.repeatReady);
}

function allConnectedReady(state: RoomState): boolean {
	const players = connectedPlayers(state);
	return players.length >= MIN_RACE_PLAYERS && players.every((player) => player.ready);
}

function assignNewHost(state: RoomState) {
	if (state.hostPlayerId && state.players[state.hostPlayerId]?.connected) return;
	state.hostPlayerId = connectedPlayers(state)[0]?.id ?? null;
}

function resetRoundPlayer(player: RoomPlayer) {
	player.ready = false;
	player.repeatReady = false;
	player.charIndex = 0;
	player.totalInputs = 0;
	player.correctInputs = 0;
	player.correctCharacters = 0;
	player.place = null;
	player.wpm = null;
	player.accuracy = null;
	player.finishedAt = null;
	player.didNotFinish = false;
}

function removeDisconnectedPlayers(state: RoomState) {
	for (const player of Object.values(state.players)) {
		if (!player.connected) delete state.players[player.id];
	}
	assignNewHost(state);
}

function returnToWaiting(state: RoomState) {
	removeDisconnectedPlayers(state);
	state.phase = "waiting";
	state.round = null;
	for (const player of Object.values(state.players)) resetRoundPlayer(player);
}

function reconcileRematch(state: RoomState, effects: RoomEffect[]) {
	const players = connectedPlayers(state);
	if (players.length === 0 || !players.every((player) => player.repeatReady)) return;
	if (players.length >= MIN_RACE_PLAYERS) {
		effects.push({ type: "round_requested" });
	} else {
		returnToWaiting(state);
	}
}

function finishRoundIfComplete(state: RoomState, effects: RoomEffect[]) {
	if (state.phase !== "racing" || !state.round) return;
	const players = Object.values(state.players);
	if (players.length === 0) return;
	if (!players.every((player) => player.place !== null || player.didNotFinish)) return;

	state.phase = "results";
	for (const player of players) {
		player.ready = false;
		player.repeatReady = false;
	}
	effects.push({ type: "round_finished", roundId: state.round.id });
}

function transitionToRacingIfDue(state: RoomState, now: number, effects: RoomEffect[]) {
	if (state.phase === "countdown" && state.round && now >= state.round.startsAt) {
		state.phase = "racing";
		effects.push({ type: "snapshot_changed" });
	}
}

export function transitionRoom(current: RoomState, event: RoomEvent): TransitionResult {
	const state = structuredClone(current);
	const effects: RoomEffect[] = [];

	switch (event.type) {
		case "join": {
			if (state.phase !== "waiting" && state.phase !== "results") {
				return reject(current, "invalid_phase");
			}
			if (state.players[event.player.id]) return reject(current, "already_joined");
			if (Object.keys(state.players).length >= MAX_RACE_PLAYERS) {
				return reject(current, "lobby_full");
			}
			state.players[event.player.id] = event.player;
			state.hostPlayerId ??= event.player.id;
			effects.push({ type: "snapshot_changed" });
			break;
		}

		case "disconnect": {
			const player = state.players[event.playerId];
			if (!player) return reject(current, "not_found");

			if (state.phase === "racing") {
				player.connected = false;
				if (player.place === null) player.didNotFinish = true;
				assignNewHost(state);
				finishRoundIfComplete(state, effects);
			} else {
				delete state.players[player.id];
				assignNewHost(state);
				if (state.phase === "countdown" && connectedPlayers(state).length < MIN_RACE_PLAYERS) {
					returnToWaiting(state);
				} else if (state.phase === "waiting" && allConnectedReady(state)) {
					effects.push({ type: "round_requested" });
				} else if (state.phase === "results") {
					reconcileRematch(state, effects);
				}
			}
			effects.push({ type: "snapshot_changed" });
			break;
		}

		case "set_ready": {
			if (state.phase !== "waiting") return reject(current, "invalid_phase");
			const player = state.players[event.playerId];
			if (!player) return reject(current, "not_found");
			if (player.ready === event.ready) return { state: current, effects: [] };
			player.ready = event.ready;
			effects.push({ type: "snapshot_changed" });
			if (allConnectedReady(state)) effects.push({ type: "round_requested" });
			break;
		}

		case "set_settings": {
			if (state.phase !== "waiting" && state.phase !== "results") {
				return reject(current, "invalid_phase");
			}
			if (state.hostPlayerId !== event.playerId) return reject(current, "not_host");
			state.settings = event.settings;
			if (state.phase === "results") {
				returnToWaiting(state);
			}
			effects.push({ type: "snapshot_changed" });
			break;
		}

		case "start_round": {
			const isReadyStart = state.phase === "waiting" && allConnectedReady(state);
			const isRepeatStart = state.phase === "results" && allConnectedRepeatReady(state);
			if (!isReadyStart && !isRepeatStart) return reject(current, "not_ready");

			const racers = connectedPlayers(state);
			if (racers.length < MIN_RACE_PLAYERS) return reject(current, "not_ready");
			if (
				event.round.text.length === 0 ||
				event.round.startsAt <= event.now ||
				event.round.deadlineAt <= event.round.startsAt
			) {
				return reject(current, "invalid_round");
			}

			removeDisconnectedPlayers(state);
			for (const player of Object.values(state.players)) resetRoundPlayer(player);
			state.round = event.round;
			state.phase = "countdown";
			effects.push({ type: "snapshot_changed" }, { type: "race_started", round: event.round });
			break;
		}

		case "progress":
		case "finish": {
			transitionToRacingIfDue(state, event.now, effects);
			if (state.phase !== "racing" || !state.round) {
				return reject(current, "invalid_phase");
			}
			if (event.roundId !== state.round.id) return reject(current, "invalid_round");
			const player = state.players[event.playerId];
			if (!player || player.didNotFinish) return reject(current, "not_found");
			if (player.place !== null) return { state: current, effects: [] };
			if (
				event.charIndex > state.round.text.length ||
				event.totalInputs < player.totalInputs ||
				event.correctInputs < player.correctInputs ||
				event.correctInputs > event.totalInputs
			) {
				return reject(current, "invalid_progress");
			}
			if (event.correctCharacters > event.charIndex) return reject(current, "invalid_progress");

			player.charIndex = event.charIndex;
			player.totalInputs = event.totalInputs;
			player.correctInputs = event.correctInputs;
			player.correctCharacters = event.correctCharacters;
			player.wpm = calculateWPMFromCorrectCharacters(
				state.round.startsAt,
				event.now,
				player.correctCharacters,
			);

			if (event.type === "progress") {
				effects.push({
					type: "progress_changed",
					playerId: player.id,
					roundId: state.round.id,
					charIndex: player.charIndex,
					correctCharacters: player.correctCharacters,
					wpm: player.wpm,
				});
				break;
			}

			if (player.charIndex !== state.round.text.length) {
				return reject(current, "invalid_progress");
			}

			player.place =
				Math.max(0, ...Object.values(state.players).map((candidate) => candidate.place ?? 0)) + 1;
			player.wpm = calculateWPMFromCorrectCharacters(
				state.round.startsAt,
				event.now,
				player.correctCharacters,
			);
			player.accuracy = calculateAccuracy(player.totalInputs, player.correctInputs);
			player.finishedAt = event.now;
			effects.push({
				type: "player_finished",
				playerId: player.id,
				roundId: state.round.id,
				charIndex: player.charIndex,
				correctCharacters: player.correctCharacters,
				place: player.place,
				wpm: player.wpm,
				accuracy: player.accuracy,
			});
			finishRoundIfComplete(state, effects);
			break;
		}

		case "set_repeat": {
			if (state.phase !== "results") return reject(current, "invalid_phase");
			const player = state.players[event.playerId];
			if (!player) return reject(current, "not_found");
			if (player.repeatReady === event.ready) return { state: current, effects: [] };
			player.repeatReady = event.ready;
			effects.push({ type: "snapshot_changed" });
			reconcileRematch(state, effects);
			break;
		}

		case "advance_time": {
			transitionToRacingIfDue(state, event.now, effects);

			if (state.phase === "racing" && state.round && event.now >= state.round.deadlineAt) {
				for (const player of Object.values(state.players)) {
					if (player.place === null) player.didNotFinish = true;
				}
				finishRoundIfComplete(state, effects);
			}
			if (event.now >= state.expiresAt) effects.push({ type: "room_expired" });
			effects.push({ type: "snapshot_changed" });
			break;
		}
	}

	state.updatedAt = event.now;
	return { state, effects };
}
