import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, parseClientMessage, parseRaceSettings } from "./protocol";

describe("race protocol", () => {
	it("normalizes a valid guest join", () => {
		expect(
			parseClientMessage({
				v: PROTOCOL_VERSION,
				type: "join",
				name: "  Ada  ",
			}),
		).toEqual({
			v: PROTOCOL_VERSION,
			type: "join",
			name: "Ada",
		});
	});

	it("rejects malformed, stale, and impossible progress messages", () => {
		expect(parseClientMessage({ v: 0, type: "start" })).toBeNull();
		expect(
			parseClientMessage({
				v: PROTOCOL_VERSION,
				type: "progress",
				roundId: "round-1",
				charIndex: -1,
				totalInputs: 2,
				correctInputs: 3,
				correctCharacters: 0,
			}),
		).toBeNull();
	});

	it("accepts only supported race settings", () => {
		expect(
			parseRaceSettings({
				preset: "words",
				corpusId: "english_1k",
				punctuationEnabled: true,
				wordCount: 30,
				quoteLength: "medium",
			}),
		).toEqual({
			preset: "words",
			corpusId: "english_1k",
			punctuationEnabled: true,
			wordCount: 30,
			quoteLength: "medium",
		});

		expect(
			parseRaceSettings({
				preset: "time",
				corpusId: "english",
				punctuationEnabled: false,
				wordCount: 30,
				quoteLength: "medium",
			}),
		).toBeNull();
	});
});
