import {
	CORPORA,
	type CorpusId,
	QUOTE_GROUP_INDEX,
	QUOTE_OPTIONS,
	type QuoteOption,
} from "./typing-settings";

export const FALLBACK_WORDS = ["the", "be", "to", "of", "and", "a", "in", "that", "have", "it"];

export interface QuoteCollection {
	buckets: Record<QuoteOption, string[]>;
	all: string[];
}

interface QuotePayload {
	groups?: Array<[number, number]>;
	quotes?: Array<{ text: string; length: number }>;
}

export function randomFrom<T>(items: readonly T[]): T | null {
	if (items.length === 0) return null;
	return items[Math.floor(Math.random() * items.length)] ?? null;
}

export function getCorpusPath(corpusId: CorpusId): string {
	return (CORPORA.find((corpus) => corpus.id === corpusId) ?? CORPORA[0]).path;
}

export function getQuotePath(corpusId: CorpusId): string {
	return corpusId.startsWith("slovak") ? "/quotes/slovak.json" : "/quotes/english.json";
}

export function parseCorpusWords(payload: unknown): string[] | null {
	const words = (payload as { words?: unknown } | null)?.words;
	return Array.isArray(words) && words.every((word) => typeof word === "string") ? words : null;
}

export function parseQuotes(payload: unknown): QuoteCollection {
	const data = (payload ?? {}) as QuotePayload;
	const groups = Array.isArray(data.groups) ? data.groups : [];
	const quotes =
		Array.isArray(data.quotes) && data.quotes.every((quote) => typeof quote.text === "string")
			? data.quotes
			: [];

	const buckets: Record<QuoteOption, string[]> = {
		short: [],
		medium: [],
		long: [],
	};
	for (const option of QUOTE_OPTIONS) {
		const range = groups[QUOTE_GROUP_INDEX[option]];
		if (!range) continue;
		const [min, max] = range;
		buckets[option] = quotes
			.filter((quote) => quote.length >= min && quote.length <= max)
			.map((quote) => quote.text);
	}
	return { buckets, all: quotes.map((quote) => quote.text) };
}

export function pickQuote(quotes: QuoteCollection | null, length: QuoteOption): string {
	return (
		randomFrom(quotes?.buckets[length] ?? []) ??
		randomFrom(quotes?.all ?? []) ??
		FALLBACK_WORDS.join(" ")
	);
}
