import { useEffect, useState } from "react";
import {
	DEFAULT_CORPUS,
	isCorpusId,
	PRESET_OPTIONS,
	QUOTE_OPTIONS,
	type QuoteOption,
	TIME_OPTIONS,
	type TimeOption,
	type TypingPreset,
	WORDS_OPTIONS,
	type WordsOption,
} from "../lib/typing-settings";

function oneOf<T extends string | number>(options: readonly T[], value: unknown): T | null {
	return options.includes(value as T) ? (value as T) : null;
}

/** State kept in localStorage, falling back when the stored value is missing or no longer valid. */
function useStoredState<T extends string | number | boolean>(
	key: string,
	fallback: T,
	parse: (stored: string) => T | null,
) {
	const [value, setValue] = useState<T>(() => {
		if (typeof window === "undefined") return fallback;
		const stored = window.localStorage.getItem(key);
		return (stored === null ? null : parse(stored)) ?? fallback;
	});

	useEffect(() => {
		window.localStorage.setItem(key, String(value));
	}, [key, value]);

	return [value, setValue] as const;
}

export function useTypingSettings() {
	const [activeCorpus, setActiveCorpus] = useStoredState(
		"typing-corpus",
		DEFAULT_CORPUS,
		(stored) => (isCorpusId(stored) ? stored : null),
	);
	const [preset, setPreset] = useStoredState<TypingPreset>("typing-preset", "time", (stored) =>
		oneOf(PRESET_OPTIONS, stored),
	);
	const [punctuationEnabled, setPunctuationEnabled] = useStoredState(
		"typing-punctuation",
		false,
		(stored) => stored === "true",
	);
	const [timeOption, setTimeOption] = useStoredState<TimeOption>(
		"typing-time-option",
		15,
		(stored) => oneOf(TIME_OPTIONS, Number(stored)),
	);
	const [wordsOption, setWordsOption] = useStoredState<WordsOption>(
		"typing-words-option",
		30,
		(stored) => oneOf(WORDS_OPTIONS, Number(stored)),
	);
	const [quoteOption, setQuoteOption] = useStoredState<QuoteOption>(
		"typing-quote-option",
		"medium",
		(stored) => oneOf(QUOTE_OPTIONS, stored),
	);

	return {
		activeCorpus,
		preset,
		punctuationEnabled,
		quoteOption,
		setActiveCorpus,
		setPreset,
		setPunctuationEnabled,
		setQuoteOption,
		setTimeOption,
		setWordsOption,
		timeOption,
		wordsOption,
	};
}
