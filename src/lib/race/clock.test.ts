import { describe, expect, it } from "vitest";
import { selectClockEstimate, serverEpochToPerformanceTime } from "./clock";

describe("race clock", () => {
	it("maps the server start time onto the local clock using the fastest sample", () => {
		const estimate = selectClockEstimate([
			{ clientSentAt: 1_000, clientReceivedAt: 1_200, serverNow: 1_120 },
			{ clientSentAt: 2_000, clientReceivedAt: 2_040, serverNow: 2_030 },
		]);
		// The 40ms round trip wins: the server read 2_030 at local time 2_020, so it runs 10ms ahead.
		expect(estimate).toEqual({ offsetMs: 10, roundTripMs: 40 });
		// A start at server time 10_500 is local wall time 10_490, 490ms after now.
		expect(serverEpochToPerformanceTime(10_500, 10, 10_000, 2_000)).toBe(2_490);
	});
});
