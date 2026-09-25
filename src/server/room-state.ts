import type { PlayerSnapshot, RaceSettings, RoomPhase, RoomSnapshot } from "../lib/race/protocol";

export const MIN_RACE_PLAYERS = 1;
export const MAX_RACE_PLAYERS = 6;
// Well above human typing speed; only catches clients reporting impossible results.
export const MAX_FINISH_WPM = 500;

export interface RoomPlayer {
	id: string;
	name: string;
	connected: boolean;
	ready: boolean;
	repeatReady: boolean;
	charIndex: number;
	totalInputs: number;
	correctInputs: number;
	correctCharacters: number;
	place: number | null;
	wpm: number | null;
	accuracy: number | null;
	finishedAt: number | null;
	didNotFinish: boolean;
}

export interface RoomRound {
	id: string;
	text: string;
	startsAt: number;
	deadlineAt: number;
}

export interface RoomState {
	code: string;
	phase: RoomPhase;
	hostPlayerId: string | null;
	settings: RaceSettings;
	players: Record<string, RoomPlayer>;
	round: RoomRound | null;
	createdAt: number;
	updatedAt: number;
	expiresAt: number;
}

export const DEFAULT_RACE_SETTINGS: RaceSettings = {
	preset: "words",
	corpusId: "english",
	punctuationEnabled: false,
	wordCount: 30,
	quoteLength: "medium",
};

export function createRoomState(code: string, now: number, expiresAt: number): RoomState {
	return {
		code,
		phase: "waiting",
		hostPlayerId: null,
		settings: DEFAULT_RACE_SETTINGS,
		players: {},
		round: null,
		createdAt: now,
		updatedAt: now,
		expiresAt,
	};
}

function toPlayerSnapshot(player: RoomPlayer): PlayerSnapshot {
	return {
		id: player.id,
		name: player.name,
		connected: player.connected,
		ready: player.ready,
		repeatReady: player.repeatReady,
		charIndex: player.charIndex,
		correctCharacters: player.correctCharacters,
		place: player.place,
		wpm: player.wpm,
		accuracy: player.accuracy,
	};
}

export function toRoomSnapshot(state: RoomState): RoomSnapshot {
	return {
		code: state.code,
		phase: state.phase,
		hostPlayerId: state.hostPlayerId,
		settings: state.settings,
		roundId: state.round?.id ?? null,
		startsAt: state.round?.startsAt ?? null,
		deadlineAt: state.round?.deadlineAt ?? null,
		players: Object.values(state.players).map(toPlayerSnapshot),
	};
}
