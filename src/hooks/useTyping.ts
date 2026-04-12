import { useCallback, useEffect, useReducer, useState } from "react";
import { initialTypingState, typingReducer } from "../lib/typing-engine";
import {
	calculateAccuracy,
	calculateWPM,
	computeWordCorrectness,
	countCorrectWords,
	countTypedWords,
} from "../lib/typing-metrics";
import { buildTypingText } from "../lib/typing-text-provider";

interface UseTypingOptions {
	mode?: "words" | "time";
	durationSec?: number;
}

export function useTyping(words: string[], numWords: number, options?: UseTypingOptions) {
	const mode = options?.mode ?? "words";
	const durationMs = (options?.durationSec ?? 30) * 1000;

	const [state, dispatch] = useReducer(
		typingReducer,
		{ words, numWords },
		({ words, numWords }) => ({
			...initialTypingState,
			text: buildTypingText(words, numWords),
		}),
	);

	const reset = useCallback(() => {
		dispatch({ type: "RESET", text: buildTypingText(words, numWords) });
	}, [words, numWords]);

	// Re-generate test when words/numWords change
	useEffect(() => {
		if (words.length > 0) {
			reset();
		}
	}, [words, numWords, reset]);

	// Keyboard handler
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Tab") {
				e.preventDefault();
				reset();
				return;
			}

			if (e.ctrlKey) {
				if (e.key === "Backspace") {
					dispatch({ type: "CTRL_BACKSPACE" });
				}
				return;
			}

			if (e.key === "Backspace") {
				dispatch({ type: "BACKSPACE" });
			} else if (e.key.length === 1) {
				e.preventDefault();
				dispatch({ type: "CHAR", key: e.key, time: performance.now() });
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [reset]);

	const [nowMs, setNowMs] = useState(0);

	useEffect(() => {
		if (mode !== "time") return;
		if (state.startTime === null || state.status === "finished") return;
		const startTime = state.startTime;

		const interval = window.setInterval(() => {
			const now = performance.now();
			setNowMs(now);

			if (now - startTime >= durationMs) {
				dispatch({ type: "FINISH", time: startTime + durationMs });
				window.clearInterval(interval);
			}
		}, 50);

		return () => window.clearInterval(interval);
	}, [durationMs, mode, state.startTime, state.status]);

	// Derived values
	const currentIndex = state.input.length;

	const correctKeys = state.input.split("").map((c, i) => c === state.text[i]);
	const wordCorrectness = computeWordCorrectness(state.text, correctKeys);

	const wpm =
		state.startTime !== null && state.endTime !== null
			? calculateWPM(state.startTime, state.endTime, correctKeys)
			: 0;

	const accuracy = calculateAccuracy(state.totalInputs, state.correctInputs);

	const typedWords = countTypedWords(state.text, currentIndex);
	const correctWords = countCorrectWords(state.text, wordCorrectness);
	const elapsedTimeMs =
		mode === "time" && state.startTime !== null
			? Math.max(
					0,
					(state.status === "finished" && state.endTime !== null ? state.endTime : nowMs) -
						state.startTime,
				)
			: 0;
	const timeLeftMs = mode === "time" ? Math.max(0, durationMs - elapsedTimeMs) : durationMs;

	return {
		text: state.text,
		input: state.input,
		currentIndex,
		correctKeys,
		wordCorrectness,
		status: state.status,
		wpm,
		accuracy,
		typedWords,
		correctWords,
		numWords,
		mode,
		timeLeftMs,
		durationMs,
		reset,
	};
}
