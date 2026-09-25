import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { CorpusPicker } from "../components/CorpusPicker";
import { ModeSwitcher } from "../components/ModeSwitcher";
import { SoloResults } from "../components/SoloResults";
import { ThemePicker } from "../components/ThemePicker";
import { TypingSettingsBar } from "../components/TypingSettingsBar";
import { TypingStage } from "../components/TypingStage";
import { Words } from "../components/Words";
import { useCorpusData } from "../hooks/useCorpusData";
import { useTyping } from "../hooks/useTyping";
import { useTypingDebugGrid } from "../hooks/useTypingDebugGrid";
import { useTypingSettings } from "../hooks/useTypingSettings";
import { pickQuote } from "../lib/passages";
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

// Phones hide the punctuation toggle and always get plain words.
function isPhoneWidth(): boolean {
	return typeof window !== "undefined" && window.matchMedia("(width < 48rem)").matches;
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
		() =>
			buildTypingText(words, targetWordCount, {
				enrichText: punctuationEnabled && !isPhoneWidth(),
			}),
		[punctuationEnabled, targetWordCount, words],
	);
	const quoteTextProvider = useCallback(
		() => pickQuote(loadedQuotes?.path === quotePath ? loadedQuotes : null, quoteOption),
		[loadedQuotes, quoteOption, quotePath],
	);
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
			<div
				data-hide-while-typing
				className="absolute top-4 right-4 z-10 flex items-start gap-2 md:top-16 md:right-auto md:left-1/2 md:-translate-x-1/2 md:gap-4 xl:top-4 xl:right-4 xl:left-auto xl:translate-x-0"
			>
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
