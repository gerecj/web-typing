/** Half-open [start, end) span of passage positions that are currently typed wrong. */
export type ErrorRange = [start: number, end: number];

// Far more than real typing produces; keeps progress messages small even when someone mashes keys.
export const MAX_ERROR_RANGES = 32;

export function findErrorRanges(
	text: string,
	input: string,
	maxRanges = MAX_ERROR_RANGES,
): ErrorRange[] {
	const ranges: ErrorRange[] = [];
	for (let index = 0; index < input.length; index++) {
		if (input[index] === text[index]) continue;
		const last = ranges[ranges.length - 1];
		if (last && last[1] === index) last[1] = index + 1;
		else ranges.push([index, index + 1]);
	}
	if (ranges.length <= maxRanges) return ranges;

	// Too fragmented to send exactly: close the smallest gaps first, which is invisible at bar scale.
	const gaps = ranges
		.slice(1)
		.map((range, index) => range[0] - ranges[index][1])
		.sort((left, right) => left - right);
	const maxMergedGap = gaps[ranges.length - maxRanges - 1];
	const merged: ErrorRange[] = [];
	for (const [start, end] of ranges) {
		const last = merged[merged.length - 1];
		if (last && start - last[1] <= maxMergedGap) last[1] = end;
		else merged.push([start, end]);
	}
	return merged;
}

/** Ranges are only drawn, never scored, so this checks shape and bounds rather than consistency. */
export function parseErrorRanges(value: unknown, charIndex: number): ErrorRange[] | null {
	if (!Array.isArray(value) || value.length > MAX_ERROR_RANGES) return null;
	const ranges: ErrorRange[] = [];
	let previousEnd = 0;
	for (const range of value) {
		if (!Array.isArray(range) || range.length !== 2) return null;
		const [start, end] = range;
		if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
		if (start < previousEnd || end <= start || end > charIndex) return null;
		ranges.push([start, end]);
		previousEnd = end;
	}
	return ranges;
}
