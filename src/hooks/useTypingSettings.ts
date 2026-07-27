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

const CORPUS_STORAGE_KEY = "typing-corpus";
const PRESET_STORAGE_KEY = "typing-preset";
const PUNCTUATION_STORAGE_KEY = "typing-punctuation";
const TIME_OPTION_STORAGE_KEY = "typing-time-option";
const WORDS_OPTION_STORAGE_KEY = "typing-words-option";
const QUOTE_OPTION_STORAGE_KEY = "typing-quote-option";

export function useTypingSettings() {
	const [preset, setPreset] = useState<TypingPreset>(() => {
		if (typeof window === "undefined") return "time";
		const stored = window.localStorage.getItem(PRESET_STORAGE_KEY);
		return PRESET_OPTIONS.includes(stored as TypingPreset) ? (stored as TypingPreset) : "time";
	});
	const [punctuationEnabled, setPunctuationEnabled] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.localStorage.getItem(PUNCTUATION_STORAGE_KEY) === "true";
	});
	const [timeOption, setTimeOption] = useState<TimeOption>(() => {
		if (typeof window === "undefined") return 15;
		const stored = Number(window.localStorage.getItem(TIME_OPTION_STORAGE_KEY));
		return TIME_OPTIONS.includes(stored as TimeOption) ? (stored as TimeOption) : 15;
	});
	const [wordsOption, setWordsOption] = useState<WordsOption>(() => {
		if (typeof window === "undefined") return 30;
		const stored = Number(window.localStorage.getItem(WORDS_OPTION_STORAGE_KEY));
		return WORDS_OPTIONS.includes(stored as WordsOption) ? (stored as WordsOption) : 30;
	});
	const [quoteOption, setQuoteOption] = useState<QuoteOption>(() => {
		if (typeof window === "undefined") return "medium";
		const stored = window.localStorage.getItem(QUOTE_OPTION_STORAGE_KEY);
		return QUOTE_OPTIONS.includes(stored as QuoteOption) ? (stored as QuoteOption) : "medium";
	});
	const [activeCorpus, setActiveCorpus] = useState(() => {
		if (typeof window === "undefined") return DEFAULT_CORPUS;
		const stored = window.localStorage.getItem(CORPUS_STORAGE_KEY);
		return isCorpusId(stored) ? stored : DEFAULT_CORPUS;
	});

	useEffect(() => {
		window.localStorage.setItem(CORPUS_STORAGE_KEY, activeCorpus);
	}, [activeCorpus]);

	useEffect(() => {
		window.localStorage.setItem(PRESET_STORAGE_KEY, preset);
	}, [preset]);

	useEffect(() => {
		window.localStorage.setItem(PUNCTUATION_STORAGE_KEY, String(punctuationEnabled));
	}, [punctuationEnabled]);

	useEffect(() => {
		window.localStorage.setItem(TIME_OPTION_STORAGE_KEY, String(timeOption));
	}, [timeOption]);

	useEffect(() => {
		window.localStorage.setItem(WORDS_OPTION_STORAGE_KEY, String(wordsOption));
	}, [wordsOption]);

	useEffect(() => {
		window.localStorage.setItem(QUOTE_OPTION_STORAGE_KEY, quoteOption);
	}, [quoteOption]);

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
