import { useCallback, useEffect, useReducer } from "react";

// --- Types ---

type Status = "idle" | "typing" | "finished";

interface TypingState {
	text: string;
	input: string;
	totalInputs: number;
	correctInputs: number;
	startTime: number | null;
	endTime: number | null;
	status: Status;
}

type TypingAction =
	| { type: "CHAR"; key: string; time: number }
	| { type: "BACKSPACE" }
	| { type: "CTRL_BACKSPACE" }
	| { type: "RESET"; text: string };

// --- Pure functions ---

function shuffleWords(words: string[], count: number): string {
	if (words.length === 0) return "";

	let pool = words;
	while (pool.length < count) {
		pool = pool.concat(words);
	}

	// Fisher-Yates shuffle on a copy
	const shuffled = pool.slice();
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	return shuffled.slice(0, count).join(" ");
}

function calculateWPM(startTime: number, endTime: number, correctKeys: boolean[]): number {
	const minutes = (endTime - startTime) / 60000;
	if (minutes <= 0) return 0;
	const correctChars = correctKeys.filter(Boolean).length;
	return Math.round(correctChars / 5 / minutes);
}

function calculateAccuracy(totalInputs: number, correctInputs: number): number {
	if (totalInputs === 0) return 0;
	return Math.round((correctInputs / totalInputs) * 100);
}

function computeWordCorrectness(text: string, correctKeys: boolean[]): (boolean | null)[] {
	const result: (boolean | null)[] = new Array(text.length).fill(null);
	let wordStart = 0;

	for (let i = 0; i <= text.length; i++) {
		if (i === text.length || text[i] === " ") {
			const isLastWord = i === text.length;
			const wordFinished = isLastWord ? correctKeys.length >= i : correctKeys.length > i;

			if (wordFinished) {
				const wordCorrect = correctKeys.slice(wordStart, i).every(Boolean);
				for (let j = wordStart; j < i; j++) {
					result[j] = wordCorrect;
				}
				// Space gets its own correctness (was it typed correctly?)
				if (!isLastWord && i < correctKeys.length) {
					result[i] = correctKeys[i];
				}
			}
			wordStart = i + 1;
		}
	}

	return result;
}

function countTypedWords(text: string, currentIndex: number): number {
	if (currentIndex === 0) return 0;
	const typed = text.slice(0, currentIndex);
	const spaces = (typed.match(/ /g) || []).length;
	return currentIndex >= text.length ? spaces + 1 : spaces;
}

// --- Reducer ---

const initialState: TypingState = {
	text: "",
	input: "",
	totalInputs: 0,
	correctInputs: 0,
	startTime: null,
	endTime: null,
	status: "idle",
};

function typingReducer(state: TypingState, action: TypingAction): TypingState {
	switch (action.type) {
		case "RESET":
			return { ...initialState, text: action.text };

		case "CHAR": {
			if (state.status === "finished") return state;
			if (state.input.length >= state.text.length) return state;

			const newInput = state.input + action.key;
			const isCorrect = action.key === state.text[state.input.length];
			const isFinished = newInput.length === state.text.length;

			return {
				...state,
				input: newInput,
				totalInputs: state.totalInputs + 1,
				correctInputs: state.correctInputs + (isCorrect ? 1 : 0),
				startTime: state.startTime ?? action.time,
				endTime: isFinished ? action.time : null,
				status: isFinished ? "finished" : "typing",
			};
		}

		case "BACKSPACE": {
			if (state.status === "finished") return state;
			if (state.input.length === 0) return state;

			return {
				...state,
				input: state.input.slice(0, -1),
			};
		}

		case "CTRL_BACKSPACE": {
			if (state.status === "finished") return state;
			if (state.input.length === 0) return state;

			return {
				...state,
				input: state.input.replace(/\S+\s*$/, ""),
			};
		}
	}
}

// --- Hook ---

export function useTyping(words: string[], numWords: number) {
	const [state, dispatch] = useReducer(
		typingReducer,
		{ words, numWords },
		({ words, numWords }) => ({
			...initialState,
			text: shuffleWords(words, numWords),
		}),
	);

	const reset = useCallback(() => {
		dispatch({ type: "RESET", text: shuffleWords(words, numWords) });
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
