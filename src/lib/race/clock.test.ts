import { describe, expect, it } from "vitest";
import { estimateClockOffset, selectClockEstimate, serverEpochToPerformanceTime } from "./clock";

describe("race clock", () => {
	it("estimates server offset from the request midpoint", () => {
		expect(
			estimateClockOffset({
				clientSentAt: 1_000,
				clientReceivedAt: 1_100,
				serverNow: 1_075,
			}),
		).toEqual({ offsetMs: 25, roundTripMs: 100 });
	});

	it("selects the lowest-latency sample", () => {
		expect(
			selectClockEstimate([
				{ clientSentAt: 1_000, clientReceivedAt: 1_200, serverNow: 1_120 },
				{ clientSentAt: 2_000, clientReceivedAt: 2_040, serverNow: 2_030 },
			]),
		).toEqual({ offsetMs: 10, roundTripMs: 40 });
	});

	it("converts a server epoch timestamp into the local monotonic clock", () => {
		expect(serverEpochToPerformanceTime(10_500, 100, 10_000, 2_000)).toBe(2_400);
	});
});
