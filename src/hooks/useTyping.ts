import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
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
	textProvider?: () => string;
	enabled?: boolean;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.closest(
			"button, a[href], input, textarea, select, summary, [contenteditable], [role='button'], [role='link']",
		) !== null
	);
}

export function useTyping(words: string[], numWords: number, options?: UseTypingOptions) {
	const mode = options?.mode ?? "words";
	const durationMs = (options?.durationSec ?? 30) * 1000;
	const enabled = options?.enabled ?? true;
	const defaultTextProvider = useCallback(
		() => buildTypingText(words, numWords),
		[words, numWords],
	);
	const buildText = options?.textProvider ?? defaultTextProvider;

	const [state, dispatch] = useReducer(typingReducer, { words, numWords }, () => ({
		...initialTypingState,
		text: buildText(),
	}));

	const reset = useCallback(() => {
		dispatch({ type: "RESET", text: buildText() });
	}, [buildText]);

	const previousConfigRef = useRef({ buildText, durationMs, enabled, mode });

	// Reset once when a usable typing configuration actually changes, never just because of mount.
	useLayoutEffect(() => {
		const previous = previousConfigRef.current;
		const changed =
			previous.buildText !== buildText ||
			previous.durationMs !== durationMs ||
			previous.enabled !== enabled ||
			previous.mode !== mode;

		previousConfigRef.current = { buildText, durationMs, enabled, mode };
		if (enabled && changed) reset();
	}, [buildText, durationMs, enabled, mode, reset]);

	// Global keyboard handling for typing input and the restart shortcut.
	useEffect(() => {
		if (!enabled) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (isInteractiveTarget(e.target)) return;

			if (e.key === "Tab") {
				e.preventDefault();
				reset();
				return;
			}

			if (e.ctrlKey || e.metaKey) {
				if (e.key === "Backspace") {
					e.preventDefault();
					dispatch({ type: "CTRL_BACKSPACE" });
				}
				return;
			}

			if (e.key === "Backspace") {
				e.preventDefault();
				dispatch({ type: "BACKSPACE" });
			} else if (e.key.length === 1) {
				e.preventDefault();
				dispatch({ type: "CHAR", key: e.key, time: performance.now() });
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [enabled, reset]);

	const [nowMs, setNowMs] = useState(0);

	// Time mode countdown loop. This drives the visible timer and auto-finish.
	useEffect(() => {
		if (!enabled) return;
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
	}, [durationMs, enabled, mode, state.startTime, state.status]);

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
	const totalWords = state.text.length === 0 ? 0 : state.text.split(" ").length;
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
		totalWords,
		correctWords,
		numWords,
		mode,
		enabled,
		timeLeftMs,
		durationMs,
		reset,
	};
}
