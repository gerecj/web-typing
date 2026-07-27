import { useEffect, useState } from "react";
import {
	CORPORA,
	type CorpusId,
	QUOTE_GROUP_INDEX,
	QUOTE_OPTIONS,
	type QuoteOption,
	type TypingPreset,
} from "../lib/typing-settings";

export const FALLBACK_WORDS = ["the", "be", "to", "of", "and", "a", "in", "that", "have", "it"];

interface QuoteItem {
	text: string;
	length: number;
}

interface QuotePayload {
	groups?: Array<[number, number]>;
	quotes?: QuoteItem[];
}

interface LoadedWords {
	corpusId: CorpusId;
	words: string[];
}

export interface LoadedQuotes {
	path: string;
	buckets: Record<QuoteOption, string[]>;
	all: string[];
}

export function getQuotePathForCorpus(corpusId: CorpusId): string {
	return corpusId.startsWith("slovak") ? "/quotes/slovak.json" : "/quotes/english.json";
}

export function useCorpusData(activeCorpus: CorpusId, preset: TypingPreset) {
	const [loadedWords, setLoadedWords] = useState<LoadedWords | null>(null);
	const [loadedQuotes, setLoadedQuotes] = useState<LoadedQuotes | null>(null);
	const quotePath = getQuotePathForCorpus(activeCorpus);

	useEffect(() => {
		const controller = new AbortController();
		let cancelled = false;

		async function loadWords() {
			const corpus = CORPORA.find((item) => item.id === activeCorpus) ?? CORPORA[0];
			try {
				const response = await fetch(corpus.path, { signal: controller.signal });
				if (!response.ok) {
					throw new Error(`Failed to fetch corpus '${corpus.id}' (${response.status})`);
				}
				const data = (await response.json()) as { words?: unknown };
				if (Array.isArray(data.words) && data.words.every((word) => typeof word === "string")) {
					if (!cancelled) {
						setLoadedWords({ corpusId: activeCorpus, words: data.words });
					}
					return;
				}
				throw new Error(`Invalid corpus payload for '${corpus.id}'`);
			} catch (error) {
				if (cancelled || controller.signal.aborted) return;

				setLoadedWords({ corpusId: activeCorpus, words: FALLBACK_WORDS });
				if (import.meta.env.DEV) {
					console.warn("[typing] Corpus load failed, using fallback words.", error);
				}
			}
		}

		void loadWords();
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [activeCorpus]);

	useEffect(() => {
		if (preset !== "quote" || loadedQuotes?.path === quotePath) return;

		const controller = new AbortController();
		let cancelled = false;
		async function loadQuotes() {
			try {
				const response = await fetch(quotePath, { signal: controller.signal });
				if (!response.ok) {
					throw new Error(`Failed to fetch quotes (${response.status})`);
				}

				const data = (await response.json()) as QuotePayload;
				const groups = Array.isArray(data.groups) ? data.groups : [];
				const quotes =
					Array.isArray(data.quotes) && data.quotes.every((quote) => typeof quote.text === "string")
						? data.quotes
						: [];
				const all = quotes.map((quote) => quote.text);

				const nextBuckets: Record<QuoteOption, string[]> = {
					short: [],
					medium: [],
					long: [],
				};

				for (const option of QUOTE_OPTIONS) {
					const range = groups[QUOTE_GROUP_INDEX[option]];
					if (!range) continue;

					const [min, max] = range;
					nextBuckets[option] = quotes
						.filter((quote) => quote.length >= min && quote.length <= max)
						.map((quote) => quote.text);
				}

				if (!cancelled) {
					setLoadedQuotes({ path: quotePath, buckets: nextBuckets, all });
				}
			} catch (error) {
				if (cancelled || controller.signal.aborted) return;

				if (import.meta.env.DEV) {
					console.warn(`[typing] Quote load failed for ${quotePath}.`, error);
				}
				setLoadedQuotes({
					path: quotePath,
					buckets: { short: [], medium: [], long: [] },
					all: [],
				});
			}
		}

		void loadQuotes();
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [loadedQuotes?.path, preset, quotePath]);

	const wordsReady = loadedWords?.corpusId === activeCorpus;
	const quotesReady = loadedQuotes?.path === quotePath;

	return {
		loadedQuotes,
		quotePath,
		quotesReady,
		words: wordsReady ? loadedWords.words : [],
		wordsReady,
	};
}
