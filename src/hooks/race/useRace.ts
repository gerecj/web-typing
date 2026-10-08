import { useEffect, useMemo, useRef } from "react";
import { findErrorRanges } from "../../lib/race/error-ranges";
import { type ClientMessage, PROTOCOL_VERSION, type ProgressReport } from "../../lib/race/protocol";
import { recordWpm } from "../../lib/skill";
import { isInteractiveTarget, useTyping } from "../useTyping";
import { useRaceSocket } from "./useRaceSocket";

const PROGRESS_INTERVAL_MS = 100;

export function useRace(code: string, name: string | null) {
	const connection = useRaceSocket(code, name);
	const activeRace = connection.activeRace;
	const typing = useTyping({
		text: activeRace?.text ?? "",
		enabled: activeRace !== null,
		scheduledStartTime: activeRace?.localStartsAt,
		allowRestart: false,
		resetKey: activeRace?.roundId,
	});
	const errorRanges = useMemo(
		() => findErrorRanges(typing.text, typing.input),
		[typing.text, typing.input],
	);
	const lastProgressSentAtRef = useRef(0);
	const pendingProgressTimerRef = useRef<number | null>(null);
	const finishSentForRoundRef = useRef<string | null>(null);

	useEffect(() => {
		const roundId = activeRace?.roundId;
		if (!roundId) return;
		if (typing.appliedResetKey !== roundId) return;
		if (finishSentForRoundRef.current === roundId) return;

		const progress: ProgressReport = {
			roundId,
			charIndex: typing.currentIndex,
			totalInputs: typing.totalInputs,
			correctInputs: typing.correctInputs,
			correctCharacters: typing.correctCharacterCount,
			errorRanges,
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
		errorRanges,
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

	// Tab toggles ready in the lobby and race again on the results, like restart does in solo.
	const phase = connection.room?.phase;
	const currentPlayer = connection.room?.players.find(
		(player) => player.id === connection.playerId,
	);
	const isReady = currentPlayer?.ready;
	const isRepeatReady = currentPlayer?.repeatReady;
	const { sendReady, sendRepeat } = connection;
	useEffect(() => {
		if (isReady === undefined || isRepeatReady === undefined) return;
		if (phase !== "waiting" && phase !== "results") return;

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Tab" || event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
				return;
			}
			// Leave Tab for focus navigation while a control is focused.
			if (isInteractiveTarget(event.target)) return;
			event.preventDefault();
			if (phase === "waiting") sendReady(!isReady);
			else sendRepeat(!isRepeatReady);
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isReady, isRepeatReady, phase, sendReady, sendRepeat]);

	// Remember this player's result, so bots can be matched to their speed.
	const roundId = connection.room?.roundId;
	const resultWpm =
		phase === "results" && currentPlayer?.place !== null ? currentPlayer?.wpm : null;
	const recordedRoundRef = useRef<string | null>(null);
	useEffect(() => {
		if (!roundId || !resultWpm || recordedRoundRef.current === roundId) return;
		recordedRoundRef.current = roundId;
		recordWpm(resultWpm);
	}, [resultWpm, roundId]);

	return { ...connection, typing, errorRanges };
}
