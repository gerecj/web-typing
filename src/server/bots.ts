import { findErrorRanges } from "../lib/race/error-ranges";
import type { ProgressReport } from "../lib/race/protocol";
import { initialTypingState, type TypingState, typingReducer } from "../lib/typing-engine";

export interface BotProfile {
	/** The WPM the bot finishes at, counting only correct characters like a player's result. */
	wpm: number;
	/** Chance of typing each character right the first time. */
	accuracy: number;
	seed: number;
}

export interface BotKeystroke {
	/** Milliseconds after the race start. */
	time: number;
	/** A character, or "Backspace". */
	key: string;
}

export type BotProgress = Omit<ProgressReport, "roundId"> & { finished: boolean };

const BOT_NAMES = [
	"Mira",
	"Tomas",
	"Kai",
	"Lena",
	"Jonas",
	"Ava",
	"Milan",
	"Noor",
	"Elias",
	"Sofia",
	"Ivo",
	"Zara",
];
const WRONG_KEYS = "asdfghjklqwertyuiopzxcvbnm";

/** Small seeded PRNG, so a bot types the same way whenever its plan is rebuilt. */
function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
}

/** Picks names by room code, so bots differ between rooms but stay put within one. */
export function botName(roomCode: string, index: number): string {
	const offset = [...roomCode].reduce((sum, character) => sum + character.charCodeAt(0), 0);
	return BOT_NAMES[(offset + index) % BOT_NAMES.length];
}

/** Spreads bots from a bit slower to a bit faster than the player, so every race is winnable but not a given. */
export function createBotProfiles(
	count: number,
	skillWpm: number,
	random: () => number = Math.random,
): BotProfile[] {
	const profiles = Array.from({ length: count }, (_, index) => {
		const spread = count === 1 ? 0 : index / (count - 1) - 0.5;
		const factor = 1 + spread * 0.3 + (random() - 0.5) * 0.08;
		return {
			wpm: Math.max(10, Math.round(skillWpm * factor)),
			accuracy: 0.93 + random() * 0.06,
			seed: Math.floor(random() * 2 ** 32),
		};
	});
	// Shuffle, so the same bot isn't always the slowest.
	for (let index = profiles.length - 1; index > 0; index--) {
		const other = Math.floor(random() * (index + 1));
		[profiles[index], profiles[other]] = [profiles[other], profiles[index]];
	}
	return profiles;
}

function wrongKey(target: string, random: () => number): string {
	const index = Math.floor(random() * WRONG_KEYS.length);
	const key = WRONG_KEYS[index];
	return key === target ? WRONG_KEYS[(index + 1) % WRONG_KEYS.length] : key;
}

/**
 * Every keystroke the bot makes in a race: mostly fixing mistakes with Backspace, sometimes
 * leaving one, and pausing now and then between words. Timing is scaled so the result lands
 * exactly on the profile's WPM.
 */
export function planBotKeystrokes(text: string, profile: BotProfile): BotKeystroke[] {
	const random = seededRandom(profile.seed);
	const gap = () => 0.6 + random() * 0.8;
	const steps: { key: string; effort: number }[] = [];
	let mistakesLeft = 0;

	for (const target of text) {
		if (random() > profile.accuracy) {
			steps.push({ key: wrongKey(target, random), effort: gap() });
			if (random() < 0.8) {
				steps.push({ key: "Backspace", effort: 2 + random() * 2 });
				steps.push({ key: target, effort: gap() });
			} else {
				mistakesLeft++;
			}
		} else {
			const pause = target === " " && random() < 0.15 ? 2.5 : 1;
			steps.push({ key: target, effort: gap() * pause });
		}
	}

	const correctCharacters = Math.max(1, text.length - mistakesLeft);
	const reactionMs = 250 + random() * 300;
	const finishMs = Math.max(reactionMs + 1, (correctCharacters / 5 / profile.wpm) * 60_000);
	const totalEffort = steps.reduce((sum, step) => sum + step.effort, 0);
	const msPerEffort = (finishMs - reactionMs) / totalEffort;

	const keystrokes: BotKeystroke[] = [];
	let time = reactionMs;
	for (const step of steps) {
		time += step.effort * msPerEffort;
		keystrokes.push({ time, key: step.key });
	}
	return keystrokes;
}

/** Where the bot is after `elapsedMs`, replayed through the same engine players type with. */
export function botProgressAt(
	text: string,
	keystrokes: BotKeystroke[],
	elapsedMs: number,
): BotProgress {
	let state: TypingState = { ...initialTypingState, text, startTime: 0 };
	for (const { key, time } of keystrokes) {
		if (time > elapsedMs) break;
		state = typingReducer(
			state,
			key === "Backspace" ? { type: "BACKSPACE" } : { type: "CHAR", key, time },
		);
	}

	let correctCharacters = 0;
	for (let index = 0; index < state.input.length; index++) {
		if (state.input[index] === text[index]) correctCharacters++;
	}
	return {
		charIndex: state.input.length,
		totalInputs: state.totalInputs,
		correctInputs: state.correctInputs,
		correctCharacters,
		errorRanges: findErrorRanges(text, state.input),
		finished: state.status === "finished",
	};
}
