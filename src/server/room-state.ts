import type { ErrorRange } from "../lib/race/error-ranges";
import type {
	PlayerSnapshot,
	RaceSettings,
	RoomKind,
	RoomPhase,
	RoomSnapshot,
} from "../lib/race/protocol";
import { type BotProfile, botName } from "./bots";

export const MIN_RACE_PLAYERS = 1;
export const MAX_RACE_PLAYERS = 6;
// Well above human typing speed; only catches clients reporting impossible results.
export const MAX_FINISH_WPM = 500;
/** What bots aim for until the player's own average is known. */
export const DEFAULT_SKILL_WPM = 40;

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
	errorRanges: ErrorRange[];
	/** Final standing, assigned when the round ends. */
	place: number | null;
	wpm: number | null;
	accuracy: number | null;
	finishedAt: number | null;
	didNotFinish: boolean;
	isBot: boolean;
	/** How a bot types this round. Server-only, so clients can't tell bots from players by it. */
	botProfile: BotProfile | null;
}

export interface RoomRound {
	id: string;
	text: string;
	startsAt: number;
	deadlineAt: number;
}

export interface RoomState {
	code: string;
	kind: RoomKind;
	phase: RoomPhase;
	hostPlayerId: string | null;
	settings: RaceSettings;
	players: Record<string, RoomPlayer>;
	round: RoomRound | null;
	/** The WPM bots are matched to. */
	skillWpm: number;
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
	botCount: 3,
};

export function createRoomPlayer(id: string, name: string): RoomPlayer {
	return {
		id,
		name,
		connected: true,
		ready: false,
		repeatReady: false,
		charIndex: 0,
		totalInputs: 0,
		correctInputs: 0,
		correctCharacters: 0,
		errorRanges: [],
		place: null,
		wpm: null,
		accuracy: null,
		finishedAt: null,
		didNotFinish: false,
		isBot: false,
		botProfile: null,
	};
}

export function createRoomState(
	code: string,
	now: number,
	expiresAt: number,
	kind: RoomKind = "friends",
): RoomState {
	return {
		code,
		kind,
		phase: "waiting",
		hostPlayerId: null,
		settings: DEFAULT_RACE_SETTINGS,
		players: {},
		round: null,
		skillWpm: DEFAULT_SKILL_WPM,
		createdAt: now,
		updatedAt: now,
		expiresAt,
	};
}

/** Adds or removes bots to match the bot count setting. Bots are always ready to race. */
export function syncBots(state: RoomState) {
	if (state.kind !== "bots") return;
	const bots = Object.values(state.players).filter((player) => player.isBot);
	for (const bot of bots.slice(state.settings.botCount)) delete state.players[bot.id];
	for (let index = bots.length; index < state.settings.botCount; index++) {
		const id = `bot-${index + 1}`;
		state.players[id] = {
			...createRoomPlayer(id, botName(state.code, index)),
			ready: true,
			repeatReady: true,
			isBot: true,
		};
	}
}

function toPlayerSnapshot(player: RoomPlayer): PlayerSnapshot {
	return {
		id: player.id,
		name: player.name,
		connected: player.connected,
		ready: player.ready,
		repeatReady: player.repeatReady,
		charIndex: player.charIndex,
		errorRanges: player.errorRanges,
		place: player.place,
		wpm: player.wpm,
		accuracy: player.accuracy,
	};
}

export function toRoomSnapshot(state: RoomState): RoomSnapshot {
	return {
		code: state.code,
		kind: state.kind,
		phase: state.phase,
		hostPlayerId: state.hostPlayerId,
		settings: state.settings,
		roundId: state.round?.id ?? null,
		startsAt: state.round?.startsAt ?? null,
		deadlineAt: state.round?.deadlineAt ?? null,
		players: Object.values(state.players).map(toPlayerSnapshot),
	};
}
