import { useEffect, useState } from "react";
import {
	FALLBACK_WORDS,
	getCorpusPath,
	getQuotePath,
	parseCorpusWords,
	parseQuotes,
	type QuoteCollection,
} from "../lib/passages";
import type { CorpusId, TypingPreset } from "../lib/typing-settings";

interface LoadedWords {
	corpusId: CorpusId;
	words: string[];
}

export interface LoadedQuotes extends QuoteCollection {
	path: string;
}

export function useCorpusData(activeCorpus: CorpusId, preset: TypingPreset) {
	const [loadedWords, setLoadedWords] = useState<LoadedWords | null>(null);
	const [loadedQuotes, setLoadedQuotes] = useState<LoadedQuotes | null>(null);
	const quotePath = getQuotePath(activeCorpus);

	useEffect(() => {
		const controller = new AbortController();

		async function loadWords() {
			try {
				const response = await fetch(getCorpusPath(activeCorpus), { signal: controller.signal });
				if (!response.ok) {
					throw new Error(`Failed to fetch corpus '${activeCorpus}' (${response.status})`);
				}
				const words = parseCorpusWords(await response.json());
				if (!words) throw new Error(`Invalid corpus payload for '${activeCorpus}'`);
				if (!controller.signal.aborted) setLoadedWords({ corpusId: activeCorpus, words });
			} catch (error) {
				if (controller.signal.aborted) return;

				setLoadedWords({ corpusId: activeCorpus, words: FALLBACK_WORDS });
				if (import.meta.env.DEV) {
					console.warn("[typing] Corpus load failed, using fallback words.", error);
				}
			}
		}

		void loadWords();
		return () => controller.abort();
	}, [activeCorpus]);

	useEffect(() => {
		if (preset !== "quote" || loadedQuotes?.path === quotePath) return;

		const controller = new AbortController();
		async function loadQuotes() {
			try {
				const response = await fetch(quotePath, { signal: controller.signal });
				if (!response.ok) {
					throw new Error(`Failed to fetch quotes (${response.status})`);
				}
				const quotes = parseQuotes(await response.json());
				if (!controller.signal.aborted) setLoadedQuotes({ path: quotePath, ...quotes });
			} catch (error) {
				if (controller.signal.aborted) return;

				if (import.meta.env.DEV) {
					console.warn(`[typing] Quote load failed for ${quotePath}.`, error);
				}
				setLoadedQuotes({ path: quotePath, ...parseQuotes(null) });
			}
		}

		void loadQuotes();
		return () => controller.abort();
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
