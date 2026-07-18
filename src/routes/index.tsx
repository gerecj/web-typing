import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { type CorpusOption, CorpusPicker } from "../components/CorpusPicker";
import { ThemePicker } from "../components/ThemePicker";
import { Words } from "../components/Words";
import { useTyping } from "../hooks/useTyping";
import { useTypingDebugGrid } from "../hooks/useTypingDebugGrid";
import { controlStyles, segmentedItemClass } from "../lib/controlStyles";
import { buildTypingText } from "../lib/typing-text-provider";

const FALLBACK_WORDS = ["the", "be", "to", "of", "and", "a", "in", "that", "have", "it"];
const CORPUS_STORAGE_KEY = "typing-corpus";
const PRESET_STORAGE_KEY = "typing-preset";
const PUNCTUATION_STORAGE_KEY = "typing-punctuation";
const TIME_OPTION_STORAGE_KEY = "typing-time-option";
const WORDS_OPTION_STORAGE_KEY = "typing-words-option";
const QUOTE_OPTION_STORAGE_KEY = "typing-quote-option";
const DEFAULT_CORPUS = "english";
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
const PRESET_OPTIONS = ["time", "words", "quote"] as const;
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

interface LoadedWords {
	corpusId: string;
	words: string[];
}

interface LoadedQuotes {
	path: string;
	buckets: Record<QuoteOption, string[]>;
	all: string[];
}

function randomFrom<T>(items: T[]): T | null {
	if (items.length === 0) return null;
	return items[Math.floor(Math.random() * items.length)] ?? null;
}

function getQuotePathForCorpus(corpusId: string): string {
	return corpusId.startsWith("slovak") ? "/quotes/slovak.json" : "/quotes/english.json";
}

export const Route = createFileRoute("/")({ component: TypingPage });

function TypingPage() {
	const { isDev, showDebugGrid } = useTypingDebugGrid();
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
		return CORPORA.some((corpus) => corpus.id === stored) ? (stored as string) : DEFAULT_CORPUS;
	});
	const [loadedWords, setLoadedWords] = useState<LoadedWords | null>(null);
	const [loadedQuotes, setLoadedQuotes] = useState<LoadedQuotes | null>(null);
	const quotePath = getQuotePathForCorpus(activeCorpus);
	const wordsReady = loadedWords?.corpusId === activeCorpus;
	const quotesReady = loadedQuotes?.path === quotePath;
	const words = wordsReady ? loadedWords.words : [];
	const mode = preset === "time" ? "time" : "words";
	const typingReady = preset === "quote" ? quotesReady : wordsReady;
	const targetWordCount =
		preset === "words" ? wordsOption : preset === "quote" ? QUOTE_WORD_COUNT[quoteOption] : 400;
	const durationSec = preset === "time" ? timeOption : 30;
	const wordsTextProvider = useCallback(
		() => buildTypingText(words, targetWordCount, { enrichText: punctuationEnabled }),
		[punctuationEnabled, targetWordCount, words],
	);
	const quoteTextProvider = useCallback(() => {
		const availableQuotes = loadedQuotes?.path === quotePath ? loadedQuotes : null;
		const selectedPool = availableQuotes?.buckets[quoteOption] ?? [];
		const picked = randomFrom(selectedPool) ?? randomFrom(availableQuotes?.all ?? []);
		return picked ?? FALLBACK_WORDS.join(" ");
	}, [loadedQuotes, quoteOption, quotePath]);
	const typing = useTyping(words, targetWordCount, {
		mode,
		durationSec,
		textProvider: preset === "quote" ? quoteTextProvider : wordsTextProvider,
		enabled: typingReady,
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

	// Load quote data for the active corpus language and split into short/medium/long pools.
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

	// Persist selected corpus so refreshes keep the same dataset.
	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(CORPUS_STORAGE_KEY, activeCorpus);
	}, [activeCorpus]);

	// Persist challenge settings so refreshes resume the same configuration.
	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(PRESET_STORAGE_KEY, preset);
	}, [preset]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(PUNCTUATION_STORAGE_KEY, String(punctuationEnabled));
	}, [punctuationEnabled]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(TIME_OPTION_STORAGE_KEY, String(timeOption));
	}, [timeOption]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(WORDS_OPTION_STORAGE_KEY, String(wordsOption));
	}, [wordsOption]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(QUOTE_OPTION_STORAGE_KEY, quoteOption);
	}, [quoteOption]);

	return (
		<main className="relative flex min-h-screen select-none items-center justify-center bg-(--bg) font-mono">
			<div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
				<div className={`absolute top-0 right-full mr-4 whitespace-nowrap ${controlStyles.group}`}>
					<button
						type="button"
						onClick={(e) => {
							setPunctuationEnabled((value) => !value);
							e.currentTarget.blur();
						}}
						className={segmentedItemClass(punctuationEnabled, "whitespace-nowrap")}
					>
						punctuation
					</button>
				</div>
				<div className={controlStyles.group}>
					{(["time", "words", "quote"] as const).map((option) => {
						return (
							<button
								key={option}
								type="button"
								onClick={(e) => {
									setPreset(option);
									e.currentTarget.blur();
								}}
								className={segmentedItemClass(preset === option)}
							>
								{option}
							</button>
						);
					})}
				</div>
				<div
					className={`absolute top-0 left-full ml-4 flex-nowrap whitespace-nowrap ${controlStyles.group}`}
				>
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
								className={segmentedItemClass(selected, "whitespace-nowrap")}
							>
								{option}
							</button>
						);
					})}
				</div>
			</div>
			<div className="absolute top-16 left-1/2 z-10 flex -translate-x-1/2 items-start gap-4 xl:top-4 xl:right-4 xl:left-auto xl:translate-x-0">
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
