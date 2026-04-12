import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type CorpusOption, CorpusPicker } from "../components/CorpusPicker";
import { ThemePicker } from "../components/ThemePicker";
import { Words } from "../components/Words";
import { useTyping } from "../hooks/useTyping";

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

const NUM_WORDS = 100;

export const Route = createFileRoute("/typing")({ component: TypingPage });

function TypingPage() {
	const [activeCorpus, setActiveCorpus] = useState(() => {
		if (typeof window === "undefined") return DEFAULT_CORPUS;
		const stored = window.localStorage.getItem(CORPUS_STORAGE_KEY);
		return CORPORA.some((corpus) => corpus.id === stored) ? (stored as string) : DEFAULT_CORPUS;
	});
	const [words, setWords] = useState<string[]>(FALLBACK_WORDS);
	const typing = useTyping(words, NUM_WORDS);

	useEffect(() => {
		const controller = new AbortController();

		async function loadWords() {
			const corpus = CORPORA.find((item) => item.id === activeCorpus) ?? CORPORA[0];
			const response = await fetch(corpus.path, { signal: controller.signal });
			if (!response.ok) return;
			const data = (await response.json()) as { words?: unknown };
			if (Array.isArray(data.words) && data.words.every((word) => typeof word === "string")) {
				setWords(data.words);
			}
		}

		loadWords().catch(() => {});
		return () => controller.abort();
	}, [activeCorpus]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(CORPUS_STORAGE_KEY, activeCorpus);
	}, [activeCorpus]);

	return (
		<main className="relative flex min-h-screen select-none items-center justify-center bg-(--bg) font-mono">
			<div className="absolute top-4 right-4 z-10 flex items-start gap-2">
				<CorpusPicker
					active={activeCorpus}
					options={CORPORA}
					onSelect={setActiveCorpus}
					className="relative"
				/>
				<ThemePicker className="relative" />
			</div>
			<Words typing={typing} />
		</main>
	);
}
