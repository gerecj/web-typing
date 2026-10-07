import { describe, expect, it } from "vitest";
import { initialTypingState, type TypingState, typingReducer } from "./typing-engine";
import { calculateAccuracy, computeWordCorrectness } from "./typing-metrics";

function typeKeys(state: TypingState, keys: string, startTime: number): TypingState {
	return [...keys].reduce(
		(current, key, index) =>
			typingReducer(current, { type: "CHAR", key, time: startTime + index * 100 }),
		state,
	);
}

describe("typing core", () => {
	it("keeps every attempt in accuracy even after mistakes are deleted", () => {
		let state = typingReducer(initialTypingState, { type: "RESET", text: "hello world" });
		state = typeKeys(state, "hello worx", 0);
		state = typingReducer(state, { type: "BACKSPACE" });
		expect(state.input).toBe("hello wor");
		state = typingReducer(state, { type: "CTRL_BACKSPACE" });
		expect(state.input).toBe("hello ");

		state = typeKeys(state, "world", 2_000);
		expect(state).toMatchObject({
			status: "finished",
			startTime: 0,
			endTime: 2_400,
			totalInputs: 15,
			correctInputs: 14,
		});
		expect(calculateAccuracy(state.totalInputs, state.correctInputs)).toBe(93);
	});

	it("starts a race at the scheduled time and ignores earlier keys", () => {
		const ready = typingReducer(initialTypingState, { type: "RESET", text: "a", startTime: 1_000 });
		expect(typingReducer(ready, { type: "CHAR", key: "a", time: 999 })).toBe(ready);
		expect(typingReducer(ready, { type: "CHAR", key: "a", time: 1_250 })).toMatchObject({
			startTime: 1_000,
			endTime: 1_250,
			status: "finished",
		});
	});

	it("marks a whole word wrong when any of its characters is", () => {
		// "cat dog" typed as "cat dxg".
		const correctKeys = [true, true, true, true, true, false, true];
		const expected = [true, true, true, true, false, false, false];
		expect(computeWordCorrectness("cat dog", correctKeys)).toEqual(expected);
	});
});
