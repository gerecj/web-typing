import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, parseClientMessage, parseRaceSettings } from "./protocol";

describe("race protocol", () => {
	it("accepts well-formed progress and rejects impossible or malformed reports", () => {
		const progress = {
			v: PROTOCOL_VERSION,
			type: "progress",
			roundId: "round-1",
			charIndex: 5,
			totalInputs: 6,
			correctInputs: 4,
			correctCharacters: 4,
			errorRanges: [[2, 3]],
		};
		expect(parseClientMessage(progress)).toEqual(progress);

		for (const invalid of [
			{ ...progress, v: PROTOCOL_VERSION - 1 },
			{ ...progress, charIndex: -1 },
			{ ...progress, correctInputs: 7 },
			{ ...progress, correctCharacters: 6 },
			{ ...progress, errorRanges: [[4, 6]] },
			{ ...progress, errorRanges: undefined },
		]) {
			expect(parseClientMessage(invalid)).toBeNull();
		}
	});

	it("only accepts race settings with a finish line", () => {
		const settings = {
			preset: "words",
			corpusId: "english_1k",
			punctuationEnabled: true,
			wordCount: 30,
			quoteLength: "medium",
		};
		expect(parseRaceSettings(settings)).toEqual(settings);
		expect(parseRaceSettings({ ...settings, preset: "time" })).toBeNull();
	});
});
