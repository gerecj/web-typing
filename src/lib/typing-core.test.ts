import { describe, expect, it } from "vitest";
import { initialTypingState, typingReducer } from "./typing-engine";
import {
	calculateAccuracy,
	calculateWPM,
	computeWordCorrectness,
	countTypedWords,
} from "./typing-metrics";

describe("typing core", () => {
	it("tracks a complete typing session", () => {
		const ready = typingReducer(initialTypingState, { type: "RESET", text: "ab" });
		const started = typingReducer(ready, { type: "CHAR", key: "a", time: 100 });
		const finished = typingReducer(started, { type: "CHAR", key: "x", time: 400 });

		expect(started).toMatchObject({
			input: "a",
			totalInputs: 1,
			correctInputs: 1,
			startTime: 100,
			endTime: null,
			lastInputTime: 100,
			status: "typing",
		});
		expect(finished).toMatchObject({
			input: "ax",
			totalInputs: 2,
			correctInputs: 1,
			startTime: 100,
			endTime: 400,
			lastInputTime: 400,
			status: "finished",
		});
		expect(typingReducer(finished, { type: "CHAR", key: "z", time: 500 })).toBe(finished);
	});

	it("supports character and word deletion without rewriting attempt history", () => {
		let state = typingReducer(initialTypingState, { type: "RESET", text: "hello world" });
		for (const [index, key] of [..."hello worx"].entries()) {
			state = typingReducer(state, { type: "CHAR", key, time: index });
		}

		state = typingReducer(state, { type: "BACKSPACE" });
		expect(state.input).toBe("hello wor");
		expect(state).toMatchObject({ totalInputs: 10, correctInputs: 9 });

		state = typingReducer(state, { type: "CTRL_BACKSPACE" });
		expect(state.input).toBe("hello ");
		expect(state).toMatchObject({ totalInputs: 10, correctInputs: 9 });
	});

	it("uses a scheduled start and ignores early input", () => {
		const ready = typingReducer(initialTypingState, {
			type: "RESET",
			text: "a",
			startTime: 1_000,
		});
		const early = typingReducer(ready, { type: "CHAR", key: "a", time: 999 });
		const finished = typingReducer(early, { type: "CHAR", key: "a", time: 1_250 });

		expect(early).toBe(ready);
		expect(finished).toMatchObject({
			input: "a",
			startTime: 1_000,
			endTime: 1_250,
			status: "finished",
		});
	});

	it("calculates word correctness and session statistics", () => {
		const text = "cat dog";
		const correctKeys = [true, true, true, true, true, false, true];
		const wordCorrectness = computeWordCorrectness(text, correctKeys);

		expect(wordCorrectness).toEqual([true, true, true, true, false, false, false]);
		expect(countTypedWords(text, correctKeys.length)).toBe(2);
		expect(calculateAccuracy(7, 6)).toBe(86);
		expect(calculateWPM(0, 60_000, correctKeys)).toBe(1);
	});
});
