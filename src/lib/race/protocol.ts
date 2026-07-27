import {
	type CorpusId,
	isCorpusId,
	isQuoteOption,
	isWordsOption,
	type QuoteOption,
	type WordsOption,
} from "../typing-settings";

export const PROTOCOL_VERSION = 2;
export const MAX_PLAYER_NAME_LENGTH = 24;
export const MAX_ROUND_ID_LENGTH = 64;

export type RoomPhase = "waiting" | "countdown" | "racing" | "results";

export interface RaceSettings {
	preset: "words" | "quote";
	corpusId: CorpusId;
	punctuationEnabled: boolean;
	wordCount: WordsOption;
	quoteLength: QuoteOption;
}

export interface PlayerSnapshot {
	id: string;
	name: string;
	connected: boolean;
	ready: boolean;
	repeatReady: boolean;
	charIndex: number;
	correctCharacters: number;
	place: number | null;
	wpm: number | null;
	accuracy: number | null;
}

export interface RoomSnapshot {
	code: string;
	phase: RoomPhase;
	hostPlayerId: string | null;
	settings: RaceSettings;
	roundId: string | null;
	startsAt: number | null;
	deadlineAt: number | null;
	players: PlayerSnapshot[];
}

interface VersionedMessage {
	v: typeof PROTOCOL_VERSION;
}

export type ClientMessage =
	| (VersionedMessage & { type: "join"; name: string })
	| (VersionedMessage & { type: "set_ready"; ready: boolean })
	| (VersionedMessage & { type: "set_settings"; settings: RaceSettings })
	| (VersionedMessage & {
			type: "progress";
			roundId: string;
			charIndex: number;
			totalInputs: number;
			correctInputs: number;
			correctCharacters: number;
	  })
	| (VersionedMessage & {
			type: "finish";
			roundId: string;
			charIndex: number;
			totalInputs: number;
			correctInputs: number;
			correctCharacters: number;
	  })
	| (VersionedMessage & { type: "set_repeat"; ready: boolean })
	| (VersionedMessage & { type: "ping"; clientSentAt: number });

export type ServerMessage =
	| (VersionedMessage & {
			type: "welcome";
			playerId: string;
			serverNow: number;
			room: RoomSnapshot;
	  })
	| (VersionedMessage & { type: "snapshot"; room: RoomSnapshot })
	| (VersionedMessage & {
			type: "race_start";
			roundId: string;
			text: string;
			startsAt: number;
			deadlineAt: number;
			settings: RaceSettings;
	  })
	| (VersionedMessage & {
			type: "player_progress";
			roundId: string;
			playerId: string;
			charIndex: number;
			correctCharacters: number;
			wpm: number;
	  })
	| (VersionedMessage & {
			type: "player_finished";
			roundId: string;
			playerId: string;
			charIndex: number;
			correctCharacters: number;
			place: number;
			wpm: number;
			accuracy: number;
	  })
	| (VersionedMessage & {
			type: "pong";
			clientSentAt: number;
			serverNow: number;
	  })
	| (VersionedMessage & {
			type: "error";
			code: string;
			message: string;
	  });

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isBoundedString(value: unknown, maxLength: number): value is string {
	return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

export function parseRaceSettings(value: unknown): RaceSettings | null {
	if (!isRecord(value)) return null;
	if (value.preset !== "words" && value.preset !== "quote") return null;
	if (!isCorpusId(value.corpusId)) return null;
	if (typeof value.punctuationEnabled !== "boolean") return null;
	if (!isWordsOption(value.wordCount)) return null;
	if (!isQuoteOption(value.quoteLength)) return null;

	return {
		preset: value.preset,
		corpusId: value.corpusId,
		punctuationEnabled: value.punctuationEnabled,
		wordCount: value.wordCount,
		quoteLength: value.quoteLength,
	};
}

export function parseClientMessage(value: unknown): ClientMessage | null {
	if (!isRecord(value) || value.v !== PROTOCOL_VERSION || typeof value.type !== "string") {
		return null;
	}

	switch (value.type) {
		case "join": {
			if (!isBoundedString(value.name, MAX_PLAYER_NAME_LENGTH)) return null;
			const name = value.name.trim();
			if (name.length === 0) return null;
			return {
				v: PROTOCOL_VERSION,
				type: "join",
				name,
			};
		}
		case "set_ready":
		case "set_repeat":
			return typeof value.ready === "boolean"
				? { v: PROTOCOL_VERSION, type: value.type, ready: value.ready }
				: null;
		case "set_settings": {
			const settings = parseRaceSettings(value.settings);
			return settings ? { v: PROTOCOL_VERSION, type: "set_settings", settings } : null;
		}
		case "progress":
		case "finish": {
			if (!isBoundedString(value.roundId, MAX_ROUND_ID_LENGTH)) return null;
			if (!isFiniteNonNegativeInteger(value.charIndex)) return null;
			if (!isFiniteNonNegativeInteger(value.totalInputs)) return null;
			if (!isFiniteNonNegativeInteger(value.correctInputs)) return null;
			if (!isFiniteNonNegativeInteger(value.correctCharacters)) return null;
			if (value.correctInputs > value.totalInputs) return null;
			if (value.correctCharacters > value.charIndex) return null;
			return {
				v: PROTOCOL_VERSION,
				type: value.type,
				roundId: value.roundId,
				charIndex: value.charIndex,
				totalInputs: value.totalInputs,
				correctInputs: value.correctInputs,
				correctCharacters: value.correctCharacters,
			};
		}
		case "ping":
			return typeof value.clientSentAt === "number" && Number.isFinite(value.clientSentAt)
				? {
						v: PROTOCOL_VERSION,
						type: "ping",
						clientSentAt: value.clientSentAt,
					}
				: null;
		default:
			return null;
	}
}

export function encodeServerMessage(message: ServerMessage): string {
	return JSON.stringify(message);
}
