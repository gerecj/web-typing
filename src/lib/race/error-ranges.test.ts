import { describe, expect, it } from "vitest";
import { findErrorRanges, MAX_ERROR_RANGES, parseErrorRanges } from "./error-ranges";

describe("race error ranges", () => {
	it("keeps each mistake at the position where it was typed", () => {
		expect(findErrorRanges("hello world", "hxllo wqrxd")).toEqual([
			[1, 2],
			[7, 8],
			[9, 10],
		]);
		expect(findErrorRanges("hello", "hexxo")).toEqual([[2, 4]]);
		expect(findErrorRanges("hello", "hel")).toEqual([]);
	});

	it("closes the smallest gaps when there are too many ranges to send", () => {
		// Errors at 0, 2, 4, 6 (gaps of 1) and 10 (gap of 3).
		expect(findErrorRanges("aaaaaaaaaaa", "babababaaab", 2)).toEqual([
			[0, 7],
			[10, 11],
		]);

		const mashed = "x".repeat(200);
		const text = "xy".repeat(100);
		expect(findErrorRanges(text, mashed).length).toBeLessThanOrEqual(MAX_ERROR_RANGES);
	});

	it("accepts only ordered ranges inside the typed text", () => {
		expect(
			parseErrorRanges(
				[
					[1, 2],
					[4, 6],
				],
				6,
			),
		).toEqual([
			[1, 2],
			[4, 6],
		]);
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
		expect(parseErrorRanges([[-1, 2]], 6)).toBeNull();
		expect(parseErrorRanges([[1.5, 2]], 6)).toBeNull();
		expect(parseErrorRanges("1-2", 6)).toBeNull();
		expect(
			parseErrorRanges(
				Array.from({ length: MAX_ERROR_RANGES + 1 }, (_, index) => [index * 2, index * 2 + 1]),
				200,
			),
		).toBeNull();
	});
});
