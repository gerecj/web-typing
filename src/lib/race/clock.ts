export interface ClockSample {
	clientSentAt: number;
	clientReceivedAt: number;
	serverNow: number;
}

export interface ClockEstimate {
	offsetMs: number;
	roundTripMs: number;
}

export function estimateClockOffset(sample: ClockSample): ClockEstimate {
	const roundTripMs = Math.max(0, sample.clientReceivedAt - sample.clientSentAt);
	const clientMidpoint = sample.clientSentAt + roundTripMs / 2;
	return {
		offsetMs: sample.serverNow - clientMidpoint,
		roundTripMs,
	};
}

export function selectClockEstimate(samples: ClockSample[]): ClockEstimate | null {
	let best: ClockEstimate | null = null;
	for (const sample of samples) {
		const estimate = estimateClockOffset(sample);
		if (best === null || estimate.roundTripMs < best.roundTripMs) {
			best = estimate;
		}
	}
	return best;
}

export function serverEpochToPerformanceTime(
	serverEpochMs: number,
	offsetMs: number,
	clientEpochNow: number,
	clientPerformanceNow: number,
): number {
	const localEpochTarget = serverEpochMs - offsetMs;
	return clientPerformanceNow + (localEpochTarget - clientEpochNow);
}
