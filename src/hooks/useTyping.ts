import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { initialTypingState, typingReducer } from "../lib/typing-engine";
import {
	calculateAccuracy,
	calculateWPM,
	computeWordCorrectness,
	countTypedWords,
} from "../lib/typing-metrics";

export interface UseTypingOptions {
	/** A fixed passage, as in races. */
	text?: string;
	/** Builds a fresh passage on every reset, as in solo. */
	textProvider?: () => string;
	mode?: "words" | "time";
	durationSec?: number;
	enabled?: boolean;
	/** A performance.now() time to start from; earlier input is ignored. Otherwise the first key starts. */
	scheduledStartTime?: number;
	allowRestart?: boolean;
	resetKey?: string | number;
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.closest(
			"button, a[href], input, textarea, select, summary, [contenteditable], [role='button'], [role='link']",
		) !== null
	);
}

export function useTyping(options: UseTypingOptions) {
	const { text, textProvider, resetKey } = options;
	const mode = options.mode ?? "words";
	const durationMs = (options.durationSec ?? 30) * 1000;
	const enabled = options.enabled ?? true;
	const scheduledStartTime = options.scheduledStartTime ?? null;
	const allowRestart = options.allowRestart ?? true;
	const buildText = useCallback(() => text ?? textProvider?.() ?? "", [text, textProvider]);

	const [state, dispatch] = useReducer(typingReducer, null, () => ({
		...initialTypingState,
		text: buildText(),
		startTime: scheduledStartTime,
	}));
	const [appliedResetKey, setAppliedResetKey] = useState(resetKey);

	const reset = useCallback(() => {
		dispatch({ type: "RESET", text: buildText(), startTime: scheduledStartTime });
	}, [buildText, scheduledStartTime]);

	const typeCharacter = useCallback(
		(key: string) => {
			const time = performance.now();
			if (scheduledStartTime !== null && time < scheduledStartTime) return;
			dispatch({ type: "CHAR", key, time });
		},
		[scheduledStartTime],
	);
	const deleteCharacter = useCallback(() => dispatch({ type: "BACKSPACE" }), []);

	const previousConfigRef = useRef({
		buildText,
		durationMs,
		enabled,
		mode,
		resetKey,
		scheduledStartTime,
	});

	// Reset once when a usable typing configuration actually changes, never just because of mount.
	useLayoutEffect(() => {
		const config = { buildText, durationMs, enabled, mode, resetKey, scheduledStartTime };
		const previous = previousConfigRef.current;
		previousConfigRef.current = config;
		const changed = (Object.keys(config) as (keyof typeof config)[]).some(
			(key) => config[key] !== previous[key],
		);
		if (enabled && changed) {
			reset();
			setAppliedResetKey(resetKey);
		}
	}, [buildText, durationMs, enabled, mode, reset, resetKey, scheduledStartTime]);

	// Global keyboard handling for typing input and the restart shortcut.
	useEffect(() => {
		if (!enabled) return;

		function handleKeyDown(e: KeyboardEvent) {
			const fromTypingInput = e.target instanceof HTMLElement && "typingInput" in e.target.dataset;
			if (!fromTypingInput && isInteractiveTarget(e.target)) return;

			if (e.key === "Tab") {
				if (allowRestart) {
					e.preventDefault();
					reset();
				}
				return;
			}

			// AltGr is reported as Ctrl+Alt on Windows, so it must still count as typing.
			const isAltGr = e.ctrlKey && e.altKey;
			if ((e.ctrlKey || e.metaKey) && !isAltGr) {
				if (e.key === "Backspace") {
					e.preventDefault();
					dispatch({ type: "CTRL_BACKSPACE" });
				}
				return;
			}
			// The hidden input handles text itself, since touch keyboards often send "Unidentified" keys.
			if (fromTypingInput) return;

			if (e.key === "Backspace") {
				e.preventDefault();
				deleteCharacter();
			} else if (e.key.length === 1) {
				e.preventDefault();
				typeCharacter(e.key);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [allowRestart, deleteCharacter, enabled, reset, typeCharacter]);

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
	const correctCharacterCount = correctKeys.filter(Boolean).length;
	const wordCorrectness = computeWordCorrectness(state.text, correctKeys);

	const wpm =
		state.startTime !== null && state.endTime !== null
			? calculateWPM(state.startTime, state.endTime, correctKeys)
			: 0;
	const liveWpmEndTime = state.endTime ?? state.lastInputTime;
	const liveWpm =
		state.startTime !== null && liveWpmEndTime !== null
			? calculateWPM(state.startTime, liveWpmEndTime, correctKeys)
			: 0;

	const accuracy = calculateAccuracy(state.totalInputs, state.correctInputs);

	const typedWords = countTypedWords(state.text, currentIndex);
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
		liveWpm,
		accuracy,
		totalInputs: state.totalInputs,
		correctInputs: state.correctInputs,
		correctCharacterCount,
		typedWords,
		totalWords,
		mode,
		enabled,
		timeLeftMs,
		appliedResetKey,
		reset,
		typeCharacter,
		deleteCharacter,
	};
}
