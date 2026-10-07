import { describe, expect, it } from "vitest";
import { findErrorRanges, MAX_ERROR_RANGES, parseErrorRanges } from "./error-ranges";

describe("race error ranges", () => {
	it("keeps mistakes where they were typed and always fits what the server accepts", () => {
		expect(findErrorRanges("hello world", "hxllo wqrxd")).toEqual([
			[1, 2],
			[7, 8],
			[9, 10],
		]);

		// Mashing produces far more separate mistakes than can be sent, so the closest ones merge.
		const text = "xy".repeat(100);
		const ranges = findErrorRanges(text, "x".repeat(200));
		expect(ranges.length).toBeLessThanOrEqual(MAX_ERROR_RANGES);
		expect(parseErrorRanges(ranges, text.length)).toEqual(ranges);
	});

	it("rejects ranges that are out of order or past the typed text", () => {
		expect(
			parseErrorRanges(
				[
					[4, 6],
					[1, 2],
				],
				6,
			),
		).toBeNull();
		expect(parseErrorRanges([[1, 7]], 6)).toBeNull();
		expect(parseErrorRanges([[2, 2]], 6)).toBeNull();
	});
});
