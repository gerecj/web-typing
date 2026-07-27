import { useEffect, useRef } from "react";
import { type ClientMessage, PROTOCOL_VERSION } from "../../lib/race/protocol";
import { useTyping } from "../useTyping";
import { useRaceSocket } from "./useRaceSocket";

const PROGRESS_INTERVAL_MS = 100;
const EMPTY_WORDS: string[] = [];

export function useRace(code: string, name: string | null) {
	const connection = useRaceSocket(code, name);
	const activeRace = connection.activeRace;
	const typing = useTyping(EMPTY_WORDS, 0, {
		text: activeRace?.text ?? "",
		enabled: activeRace !== null,
		inputPolicy: "free",
		startPolicy: "scheduled",
		scheduledStartTime: activeRace?.localStartsAt,
		allowRestart: false,
		resetKey: activeRace?.roundId,
	});
	const lastProgressSentAtRef = useRef(0);
	const pendingProgressTimerRef = useRef<number | null>(null);
	const finishSentForRoundRef = useRef<string | null>(null);

	useEffect(() => {
		const roundId = activeRace?.roundId;
		if (!roundId) return;
		if (typing.appliedResetKey !== roundId) return;
		if (finishSentForRoundRef.current === roundId) return;

		const progress = {
			roundId,
			charIndex: typing.currentIndex,
			totalInputs: typing.totalInputs,
			correctInputs: typing.correctInputs,
			correctCharacters: typing.correctCharacterCount,
		};

		if (typing.status === "finished") {
			const message: ClientMessage = {
				v: PROTOCOL_VERSION,
				type: "finish",
				...progress,
			};
			if (pendingProgressTimerRef.current !== null) {
				window.clearTimeout(pendingProgressTimerRef.current);
				pendingProgressTimerRef.current = null;
			}
			if (connection.send(message)) {
				finishSentForRoundRef.current = roundId;
				lastProgressSentAtRef.current = performance.now();
			}
			return;
		}

		if (typing.totalInputs === 0) return;
		const message: ClientMessage = {
			v: PROTOCOL_VERSION,
			type: "progress",
			...progress,
		};
		const elapsed = performance.now() - lastProgressSentAtRef.current;
		const sendProgress = () => {
			pendingProgressTimerRef.current = null;
			if (connection.send(message)) lastProgressSentAtRef.current = performance.now();
		};

		if (elapsed >= PROGRESS_INTERVAL_MS) {
			sendProgress();
		} else {
			if (pendingProgressTimerRef.current !== null) {
				window.clearTimeout(pendingProgressTimerRef.current);
			}
			pendingProgressTimerRef.current = window.setTimeout(
				sendProgress,
				PROGRESS_INTERVAL_MS - elapsed,
			);
		}

		return () => {
			if (pendingProgressTimerRef.current !== null) {
				window.clearTimeout(pendingProgressTimerRef.current);
				pendingProgressTimerRef.current = null;
			}
		};
	}, [
		activeRace?.roundId,
		connection.send,
		typing.appliedResetKey,
		typing.correctInputs,
		typing.correctCharacterCount,
		typing.currentIndex,
		typing.status,
		typing.totalInputs,
	]);

	useEffect(() => {
		finishSentForRoundRef.current = null;
		lastProgressSentAtRef.current = 0;
	}, [activeRace?.roundId]);

	return { ...connection, typing };
}
