import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { CorpusPicker } from "../components/CorpusPicker";
import { ModeSwitcher } from "../components/ModeSwitcher";
import { SoloResults } from "../components/SoloResults";
import { ThemePicker } from "../components/ThemePicker";
import { TypingSettingsBar } from "../components/TypingSettingsBar";
import { TypingStage } from "../components/TypingStage";
import { Words } from "../components/Words";
import { FALLBACK_WORDS, useCorpusData } from "../hooks/useCorpusData";
import { useTyping } from "../hooks/useTyping";
import { useTypingDebugGrid } from "../hooks/useTypingDebugGrid";
import { useTypingSettings } from "../hooks/useTypingSettings";
import {
	CORPORA,
	isCorpusId,
	PRESET_OPTIONS,
	QUOTE_OPTIONS,
	QUOTE_WORD_COUNT,
	TIME_OPTIONS,
	type TimeOption,
	WORDS_OPTIONS,
	type WordsOption,
} from "../lib/typing-settings";
import { buildTypingText } from "../lib/typing-text-provider";

function randomFrom<T>(items: T[]): T | null {
	if (items.length === 0) return null;
	return items[Math.floor(Math.random() * items.length)] ?? null;
}

export const Route = createFileRoute("/")({ component: TypingPage });

function TypingPage() {
	const { isDev, showDebugGrid } = useTypingDebugGrid();
	const {
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
	} = useTypingSettings();
	const { loadedQuotes, quotePath, quotesReady, words, wordsReady } = useCorpusData(
		activeCorpus,
		preset,
	);

	const mode = preset === "time" ? "time" : "words";
	const typingReady = preset === "quote" ? quotesReady : wordsReady;
	const targetWordCount =
		preset === "words" ? wordsOption : preset === "quote" ? QUOTE_WORD_COUNT[quoteOption] : 400;
	const durationSec = preset === "time" ? timeOption : 30;
	const lengthOptions =
		preset === "quote" ? QUOTE_OPTIONS : preset === "words" ? WORDS_OPTIONS : TIME_OPTIONS;
	const selectedLength =
		preset === "quote" ? quoteOption : preset === "words" ? wordsOption : timeOption;
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

	return (
		<main className="relative flex min-h-screen select-none items-center justify-center bg-(--bg) font-mono">
			<div className="absolute top-4 left-4 z-10">
				<ModeSwitcher active="solo" />
			</div>
			<TypingSettingsBar
				preset={preset}
				presetOptions={PRESET_OPTIONS}
				lengthOptions={lengthOptions}
				selectedLength={selectedLength}
				punctuationEnabled={punctuationEnabled}
				onPresetChange={setPreset}
				onLengthChange={(option) => {
					if (preset === "time") setTimeOption(option as TimeOption);
					else if (preset === "words") setWordsOption(option as WordsOption);
					else setQuoteOption(option as typeof quoteOption);
				}}
				onTogglePunctuation={() => setPunctuationEnabled((value) => !value)}
			/>
			<div className="absolute top-16 left-1/2 z-10 flex -translate-x-1/2 items-start gap-4 xl:top-4 xl:right-4 xl:left-auto xl:translate-x-0">
				<CorpusPicker
					active={activeCorpus}
					options={CORPORA}
					onSelect={(id) => {
						if (isCorpusId(id)) setActiveCorpus(id);
					}}
					className="relative"
				/>
				<ThemePicker className="relative" />
			</div>
			{isDev && (
				<div className="pointer-events-none absolute bottom-4 left-4 text-(--text-muted) text-xs">
					Alt+G: grid ({showDebugGrid ? "on" : "off"})
				</div>
			)}
			<TypingStage
				bottomContent={typing.status === "finished" ? <SoloResults typing={typing} /> : null}
			>
				<Words typing={typing} />
			</TypingStage>
		</main>
	);
}
