import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ClockSample,
	selectClockEstimate,
	serverEpochToPerformanceTime,
} from "../../lib/race/clock";
import {
	type ClientMessage,
	PROTOCOL_VERSION,
	type RaceSettings,
	type RoomSnapshot,
	type ServerMessage,
} from "../../lib/race/protocol";

export interface ActiveRace {
	roundId: string;
	text: string;
	startsAt: number;
	localStartsAt: number;
	deadlineAt: number;
	settings: RaceSettings;
}

function websocketUrl(code: string): string {
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	return `${protocol}//${window.location.host}/api/lobbies/${code}/websocket`;
}

function updatePlayer(
	room: RoomSnapshot | null,
	playerId: string,
	update: (player: RoomSnapshot["players"][number]) => RoomSnapshot["players"][number],
): RoomSnapshot | null {
	if (!room) return room;
	return {
		...room,
		players: room.players.map((player) => (player.id === playerId ? update(player) : player)),
	};
}

export function useRaceSocket(code: string, name: string | null) {
	const [room, setRoom] = useState<RoomSnapshot | null>(null);
	const [playerId, setPlayerId] = useState<string | null>(null);
	const [activeRace, setActiveRace] = useState<ActiveRace | null>(null);
	const [clockOffsetMs, setClockOffsetMs] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const socketRef = useRef<WebSocket | null>(null);
	const clockSamplesRef = useRef<ClockSample[]>([]);
	const clockOffsetRef = useRef(0);

	useEffect(() => {
		if (!name) return;

		let disposed = false;
		const socket = new WebSocket(websocketUrl(code));
		socketRef.current = socket;

		socket.addEventListener("open", () => {
			if (disposed) return;
			const join: ClientMessage = {
				v: PROTOCOL_VERSION,
				type: "join",
				name,
			};
			socket.send(JSON.stringify(join));
		});

		socket.addEventListener("message", (event) => {
			if (disposed || typeof event.data !== "string") return;
			let message: ServerMessage;
			try {
				message = JSON.parse(event.data) as ServerMessage;
			} catch {
				setError("The lobby sent an unreadable response.");
				return;
			}
			if (message.v !== PROTOCOL_VERSION) {
				setError("The lobby protocol changed. Return to the race menu and try again.");
				return;
			}

			switch (message.type) {
				case "welcome":
					setPlayerId(message.playerId);
					setRoom(message.room);
					setError(null);
					for (let index = 0; index < 3; index++) {
						window.setTimeout(() => {
							if (socket.readyState !== WebSocket.OPEN) return;
							socket.send(
								JSON.stringify({
									v: PROTOCOL_VERSION,
									type: "ping",
									clientSentAt: Date.now(),
								} satisfies ClientMessage),
							);
						}, index * 100);
					}
					break;
				case "snapshot":
					setRoom(message.room);
					break;
				case "race_start": {
					const localStartsAt = serverEpochToPerformanceTime(
						message.startsAt,
						clockOffsetRef.current,
						Date.now(),
						performance.now(),
					);
					setActiveRace({ ...message, localStartsAt });
					setError(null);
					break;
				}
				case "player_progress":
					setRoom((current) =>
						updatePlayer(current, message.playerId, (player) => ({
							...player,
							charIndex: message.charIndex,
							correctCharacters: message.correctCharacters,
							wpm: message.wpm,
						})),
					);
					break;
				case "player_finished":
					setRoom((current) =>
						updatePlayer(current, message.playerId, (player) => ({
							...player,
							charIndex: message.charIndex,
							correctCharacters: message.correctCharacters,
							place: message.place,
							wpm: message.wpm,
							accuracy: message.accuracy,
						})),
					);
					break;
				case "pong": {
					const sample = {
						clientSentAt: message.clientSentAt,
						clientReceivedAt: Date.now(),
						serverNow: message.serverNow,
					};
					clockSamplesRef.current = [...clockSamplesRef.current.slice(-4), sample];
					const estimate = selectClockEstimate(clockSamplesRef.current);
					if (estimate) {
						clockOffsetRef.current = estimate.offsetMs;
						setClockOffsetMs(estimate.offsetMs);
						setActiveRace((current) =>
							current
								? {
										...current,
										localStartsAt: serverEpochToPerformanceTime(
											current.startsAt,
											estimate.offsetMs,
											Date.now(),
											performance.now(),
										),
									}
								: current,
						);
					}
					break;
				}
				case "error":
					setError(message.message);
					break;
			}
		});

		socket.addEventListener("close", () => {
			if (disposed) return;
			socketRef.current = null;
			// Keep a more specific error the server may have sent before closing.
			setError((current) => current ?? "The lobby connection was closed.");
		});

		return () => {
			disposed = true;
			socketRef.current?.close(1000, "Leaving lobby");
			socketRef.current = null;
		};
	}, [code, name]);

	const send = useCallback((message: ClientMessage): boolean => {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) return false;
		socket.send(JSON.stringify(message));
		return true;
	}, []);

	const sendReady = useCallback(
		(ready: boolean) => send({ v: PROTOCOL_VERSION, type: "set_ready", ready }),
		[send],
	);
	const sendSettings = useCallback(
		(settings: RaceSettings) => send({ v: PROTOCOL_VERSION, type: "set_settings", settings }),
		[send],
	);
	const sendRepeat = useCallback(
		(ready: boolean) => send({ v: PROTOCOL_VERSION, type: "set_repeat", ready }),
		[send],
	);

	return {
		activeRace,
		clockOffsetMs,
		error,
		playerId,
		room,
		send,
		sendReady,
		sendRepeat,
		sendSettings,
	};
}
