export const TIME_OPTIONS = [15, 30, 60] as const;
export const WORDS_OPTIONS = [15, 30, 60] as const;
export const QUOTE_OPTIONS = ["short", "medium", "long"] as const;
export const PRESET_OPTIONS = ["time", "words", "quote"] as const;

export type TypingPreset = (typeof PRESET_OPTIONS)[number];
export type TimeOption = (typeof TIME_OPTIONS)[number];
export type WordsOption = (typeof WORDS_OPTIONS)[number];
export type QuoteOption = (typeof QUOTE_OPTIONS)[number];

export const CORPORA = [
	{ id: "english", label: "English", path: "/corpora/english.json" },
	{ id: "english_1k", label: "English 1K", path: "/corpora/english_1k.json" },
	{ id: "english_10k", label: "English 10K", path: "/corpora/english_10k.json" },
	{ id: "slovak", label: "Slovak", path: "/corpora/slovak.json" },
	{ id: "slovak_1k", label: "Slovak 1K", path: "/corpora/slovak_1k.json" },
	{ id: "slovak_10k", label: "Slovak 10K", path: "/corpora/slovak_10k.json" },
] as const;

export type CorpusId = (typeof CORPORA)[number]["id"];

export const DEFAULT_CORPUS: CorpusId = "english";

export const QUOTE_WORD_COUNT: Record<QuoteOption, number> = {
	short: 15,
	medium: 30,
	long: 60,
};

export const QUOTE_GROUP_INDEX: Record<QuoteOption, number> = {
	short: 0,
	medium: 1,
	long: 2,
};

export function isCorpusId(value: unknown): value is CorpusId {
	return typeof value === "string" && CORPORA.some((corpus) => corpus.id === value);
}

export function isWordsOption(value: unknown): value is WordsOption {
	return typeof value === "number" && WORDS_OPTIONS.includes(value as WordsOption);
}

export function isQuoteOption(value: unknown): value is QuoteOption {
	return typeof value === "string" && QUOTE_OPTIONS.includes(value as QuoteOption);
}
