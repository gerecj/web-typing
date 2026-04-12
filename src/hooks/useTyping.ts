import { useCallback, useEffect, useReducer } from "react";
import { initialTypingState, typingReducer } from "../lib/typing-engine";
import {
	calculateAccuracy,
	calculateWPM,
	computeWordCorrectness,
	countTypedWords,
} from "../lib/typing-metrics";
import { buildTypingText } from "../lib/typing-text-provider";

// --- Hook ---

export function useTyping(words: string[], numWords: number) {
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
		numWords,
		reset,
	};
}
