import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { CorpusPicker } from "../../components/CorpusPicker";
import { ModeSwitcher } from "../../components/ModeSwitcher";
import { Countdown } from "../../components/race/Countdown";
import { LobbyPanel } from "../../components/race/LobbyPanel";
import { RaceProgress } from "../../components/race/RaceProgress";
import { RaceResults } from "../../components/race/RaceResults";
import { ThemePicker } from "../../components/ThemePicker";
import { TypingSettingsBar } from "../../components/TypingSettingsBar";
import { TypingStage } from "../../components/TypingStage";
import { Words } from "../../components/Words";
import { useRace } from "../../hooks/race/useRace";
import { RACE_PLAYER_NAME_STORAGE_KEY } from "../../lib/race/session";
import { CORPORA, QUOTE_OPTIONS, WORDS_OPTIONS } from "../../lib/typing-settings";

export const Route = createFileRoute("/race/$code")({
	component: RaceRoomPage,
});

function RaceRoomPage() {
	const { code } = Route.useParams();
	const [name, setName] = useState<string | null>(() => {
		if (typeof window === "undefined") return null;
		return window.sessionStorage.getItem(RACE_PLAYER_NAME_STORAGE_KEY);
	});
	const race = useRace(code, name);
	const showRaceSettings = race.room?.phase === "countdown" || race.room?.phase === "racing";

	function join(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const nextName = String(data.get("name") ?? "").trim();
		if (!nextName || nextName.length > 24) return;
		window.sessionStorage.setItem(RACE_PLAYER_NAME_STORAGE_KEY, nextName);
		setName(nextName);
	}

	return (
		<main className="relative flex min-h-screen select-none items-center justify-center bg-(--bg) py-24 font-mono">
			<div className="absolute top-4 left-4 z-30">
				<ModeSwitcher active="race" />
			</div>
			{showRaceSettings && race.room && (
				<TypingSettingsBar
					preset={race.room.settings.preset}
					presetOptions={["words", "quote"]}
					lengthOptions={race.room.settings.preset === "words" ? WORDS_OPTIONS : QUOTE_OPTIONS}
					selectedLength={
						race.room.settings.preset === "words"
							? race.room.settings.wordCount
							: race.room.settings.quoteLength
					}
					punctuationEnabled={race.room.settings.punctuationEnabled}
					showPunctuation={race.room.settings.preset === "words"}
				/>
			)}
			<div className="absolute top-4 right-4 z-30 flex items-start gap-4">
				{showRaceSettings && race.room && (
					<CorpusPicker
						active={race.room.settings.corpusId}
						options={CORPORA}
						className="relative"
					/>
				)}
				<ThemePicker className="relative" />
			</div>

			{!name ? (
				<form
					onSubmit={join}
					className="mx-4 w-full max-w-sm space-y-4 rounded-xl border border-(--text-muted)/20 p-6 text-center"
				>
					<h1 className="font-bold text-(--accent) text-2xl">join {code}</h1>
					<input
						name="name"
						required
						maxLength={24}
						placeholder="Guest name"
						className="w-full select-text rounded-md border border-(--text-muted)/30 bg-transparent px-3 py-2 text-(--text) outline-none focus:border-(--accent)"
					/>
					<button type="submit" className="w-full rounded-md bg-(--accent) px-4 py-2 text-(--bg)">
						join lobby
					</button>
				</form>
			) : !race.room ? (
				<div className="text-center">
					<p className="text-(--text-muted)">connecting to {code}…</p>
					{race.error && (
						<>
							<p className="mt-3 text-(--text-error) text-sm">{race.error}</p>
							<Link to="/race" className="mt-4 inline-block text-(--accent) underline">
								back to race menu
							</Link>
						</>
					)}
				</div>
			) : race.room.phase === "waiting" ? (
				<LobbyPanel
					room={race.room}
					currentPlayerId={race.playerId}
					onReady={race.sendReady}
					onSettings={race.sendSettings}
				/>
			) : race.room.phase === "results" ? (
				<RaceResults room={race.room} currentPlayerId={race.playerId} onRepeat={race.sendRepeat} />
			) : race.activeRace ? (
				<TypingStage
					topContent={
						<RaceProgress
							room={race.room}
							textLength={race.activeRace.text.length}
							currentPlayerId={race.playerId}
							localCharIndex={race.typing.currentIndex}
							localCorrectCharacters={race.typing.correctCharacterCount}
							localWpm={race.typing.liveWpm}
						/>
					}
				>
					<Words typing={race.typing} />
					{race.room.phase === "countdown" && (
						<Countdown startsAt={race.activeRace.startsAt} clockOffsetMs={race.clockOffsetMs} />
					)}
				</TypingStage>
			) : (
				<p className="text-(--text-muted)">preparing the shared passage…</p>
			)}

			{race.error && race.room && (
				<p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-(--text-error) text-sm">
					{race.error}
				</p>
			)}
		</main>
	);
}
