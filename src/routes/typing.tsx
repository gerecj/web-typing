import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { type CorpusOption, CorpusPicker } from "../components/CorpusPicker";
import { ThemePicker } from "../components/ThemePicker";
import { Words } from "../components/Words";
import { useTyping } from "../hooks/useTyping";
import { useTypingDebugGrid } from "../hooks/useTypingDebugGrid";

const FALLBACK_WORDS = ["the", "be", "to", "of", "and", "a", "in", "that", "have", "it"];
const CORPUS_STORAGE_KEY = "typing-corpus";
const DEFAULT_CORPUS = "english_1k";
const CORPORA: Array<CorpusOption & { path: string }> = [
	{ id: "english", label: "English", path: "/corpora/english.json" },
	{ id: "english_1k", label: "English 1K", path: "/corpora/english_1k.json" },
	{ id: "english_10k", label: "English 10K", path: "/corpora/english_10k.json" },
	{ id: "slovak", label: "Slovak", path: "/corpora/slovak.json" },
	{ id: "slovak_1k", label: "Slovak 1K", path: "/corpora/slovak_1k.json" },
	{ id: "slovak_10k", label: "Slovak 10K", path: "/corpora/slovak_10k.json" },
];

const TIME_OPTIONS = [15, 30, 60] as const;
const WORDS_OPTIONS = [15, 30, 60] as const;
const QUOTE_OPTIONS = ["short", "medium", "long"] as const;
const QUOTE_WORD_COUNT: Record<(typeof QUOTE_OPTIONS)[number], number> = {
	short: 15,
	medium: 30,
	long: 60,
};
const QUOTE_GROUP_INDEX: Record<(typeof QUOTE_OPTIONS)[number], number> = {
	short: 0,
	medium: 1,
	long: 2,
};

type TypingPreset = "time" | "words" | "quote";
type TimeOption = (typeof TIME_OPTIONS)[number];
type WordsOption = (typeof WORDS_OPTIONS)[number];
type QuoteOption = (typeof QUOTE_OPTIONS)[number];

interface QuoteItem {
	text: string;
	length: number;
}

interface QuotePayload {
	groups?: Array<[number, number]>;
	quotes?: QuoteItem[];
}

function randomFrom<T>(items: T[]): T | null {
	if (items.length === 0) return null;
	return items[Math.floor(Math.random() * items.length)] ?? null;
}

function getQuotePathForCorpus(corpusId: string): string {
	return corpusId.startsWith("slovak") ? "/quotes/slovak.json" : "/quotes/english.json";
}

export const Route = createFileRoute("/typing")({ component: TypingPage });

function TypingPage() {
	const { isDev, showDebugGrid } = useTypingDebugGrid();
	const [preset, setPreset] = useState<TypingPreset>("time");
	const [timeOption, setTimeOption] = useState<TimeOption>(30);
	const [wordsOption, setWordsOption] = useState<WordsOption>(30);
	const [quoteOption, setQuoteOption] = useState<QuoteOption>("medium");
	const [activeCorpus, setActiveCorpus] = useState(() => {
		if (typeof window === "undefined") return DEFAULT_CORPUS;
		const stored = window.localStorage.getItem(CORPUS_STORAGE_KEY);
		return CORPORA.some((corpus) => corpus.id === stored) ? (stored as string) : DEFAULT_CORPUS;
	});
	const [words, setWords] = useState<string[]>(FALLBACK_WORDS);
	const [quoteBuckets, setQuoteBuckets] = useState<Record<QuoteOption, string[]>>({
		short: [],
		medium: [],
		long: [],
	});
	const [allQuotes, setAllQuotes] = useState<string[]>([]);
	const mode = preset === "time" ? "time" : "words";
	const targetWordCount =
		preset === "words" ? wordsOption : preset === "quote" ? QUOTE_WORD_COUNT[quoteOption] : 400;
	const durationSec = preset === "time" ? timeOption : 30;
	const quoteTextProvider = useCallback(() => {
		const selectedPool = quoteBuckets[quoteOption];
		const picked = randomFrom(selectedPool) ?? randomFrom(allQuotes);
		return picked ?? FALLBACK_WORDS.join(" ");
	}, [allQuotes, quoteBuckets, quoteOption]);
	const typing = useTyping(words, targetWordCount, {
		mode,
		durationSec,
		textProvider: preset === "quote" ? quoteTextProvider : undefined,
	});

	// Fetch the active corpus file whenever corpus selection changes.
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
						setWords(data.words);
					}
					return;
				}
				throw new Error(`Invalid corpus payload for '${corpus.id}'`);
			} catch (error) {
				if (!cancelled) {
					setWords(FALLBACK_WORDS);
				}
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

	// Load quote data for the active corpus language and split into short/medium/long pools.
	useEffect(() => {
		const controller = new AbortController();
		let cancelled = false;
		const quotePath = getQuotePathForCorpus(activeCorpus);

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
					setAllQuotes(all);
					setQuoteBuckets(nextBuckets);
				}
			} catch (error) {
				if (import.meta.env.DEV) {
					console.warn(`[typing] Quote load failed for ${quotePath}.`, error);
				}
				if (!cancelled) {
					setAllQuotes([]);
					setQuoteBuckets({ short: [], medium: [], long: [] });
				}
			}
		}

		void loadQuotes();
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [activeCorpus]);

	// Persist selected corpus so refreshes keep the same dataset.
	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(CORPUS_STORAGE_KEY, activeCorpus);
	}, [activeCorpus]);

	// Keep session state consistent when test preset/options change.
	useEffect(() => {
		typing.reset();
	}, [preset, quoteOption, timeOption, typing.reset, wordsOption]);

	return (
		<main className="relative flex min-h-screen select-none items-center justify-center bg-(--bg) font-mono">
			<div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
				<div className="flex items-center gap-1 rounded-lg border border-(--text-muted)/30 bg-(--bg) p-1">
					{(["time", "words", "quote"] as const).map((option) => {
						return (
							<button
								key={option}
								type="button"
								onClick={(e) => {
									setPreset(option);
									e.currentTarget.blur();
								}}
								className={`rounded-md px-3 py-1.5 text-sm transition ${
									preset === option
										? "bg-(--text-muted)/20 text-(--accent)"
										: "text-(--text-muted) hover:bg-(--text-muted)/10 hover:text-(--text)"
								}`}
							>
								{option}
							</button>
						);
					})}
				</div>
				<div className="absolute top-0 left-full ml-2 flex flex-nowrap items-center gap-1 whitespace-nowrap rounded-lg border border-(--text-muted)/30 bg-(--bg) p-1">
					{(preset === "quote" ? QUOTE_OPTIONS : TIME_OPTIONS).map((option) => {
						const selected =
							preset === "time"
								? timeOption === option
								: preset === "words"
									? wordsOption === option
									: quoteOption === option;
						const onClick =
							preset === "time"
								? () => setTimeOption(option as TimeOption)
								: preset === "words"
									? () => setWordsOption(option as WordsOption)
									: () => setQuoteOption(option as QuoteOption);

						return (
							<button
								key={option}
								type="button"
								onClick={(e) => {
									onClick();
									e.currentTarget.blur();
								}}
								className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition ${
									selected
										? "bg-(--text-muted)/20 text-(--accent)"
										: "text-(--text-muted) hover:bg-(--text-muted)/10 hover:text-(--text)"
								}`}
							>
								{option}
							</button>
						);
					})}
				</div>
			</div>
			<div className="absolute top-4 right-4 z-10 flex items-start gap-2">
				<CorpusPicker
					active={activeCorpus}
					options={CORPORA}
					onSelect={setActiveCorpus}
					className="relative"
				/>
				<ThemePicker className="relative" />
			</div>
			{isDev && (
				<div className="pointer-events-none absolute bottom-4 left-4 text-(--text-muted) text-xs">
					Alt+G: grid ({showDebugGrid ? "on" : "off"})
				</div>
			)}
			<Words typing={typing} />
		</main>
	);
}
