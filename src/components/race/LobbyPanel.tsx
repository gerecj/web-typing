import { controlStyles, segmentedItemClass } from "../../lib/controlStyles";
import type { RaceSettings, RoomSnapshot } from "../../lib/race/protocol";
import {
	CORPORA,
	type CorpusId,
	QUOTE_OPTIONS,
	type QuoteOption,
	WORDS_OPTIONS,
	type WordsOption,
} from "../../lib/typing-settings";
import { PlayerList } from "./PlayerList";

interface LobbyPanelProps {
	room: RoomSnapshot;
	currentPlayerId: string | null;
	onReady: (ready: boolean) => void;
	onSettings: (settings: RaceSettings) => void;
}

export function LobbyPanel({ room, currentPlayerId, onReady, onSettings }: LobbyPanelProps) {
	const currentPlayer = room.players.find((player) => player.id === currentPlayerId);
	const isHost = currentPlayerId === room.hostPlayerId;

	function updateSettings(patch: Partial<RaceSettings>) {
		onSettings({ ...room.settings, ...patch });
	}

	return (
		<section className="w-fit max-w-[calc(100vw-2rem)] space-y-6 rounded-xl border border-(--text-muted)/20 bg-(--bg) p-6 shadow-2xl">
			<header className="text-center">
				<p className="text-(--text-muted) text-sm">lobby</p>
				<h1 className="select-text font-bold text-(--accent) text-3xl tracking-[0.2em]">
					{room.code}
				</h1>
				<p className="mt-2 text-(--text-muted) text-sm">Share this code or the current URL.</p>
			</header>

			<div>
				<div className="flex items-center justify-center gap-3 whitespace-nowrap">
					<div className={controlStyles.group}>
						{(["words", "quote"] as const).map((preset) => (
							<button
								key={preset}
								type="button"
								disabled={!isHost}
								onClick={() => updateSettings({ preset })}
								className={segmentedItemClass(room.settings.preset === preset)}
							>
								{preset}
							</button>
						))}
					</div>

					<select
						aria-label="Race corpus"
						disabled={!isHost}
						value={room.settings.corpusId}
						onChange={(event) =>
							updateSettings({ corpusId: event.currentTarget.value as CorpusId })
						}
						className="rounded-md border border-(--text-muted)/30 bg-(--bg) px-3 py-2 text-(--text) text-sm outline-none focus:border-(--accent)"
					>
						{CORPORA.map((corpus) => (
							<option key={corpus.id} value={corpus.id}>
								{corpus.label}
							</option>
						))}
					</select>

					<div className={controlStyles.group}>
						{(room.settings.preset === "words" ? WORDS_OPTIONS : QUOTE_OPTIONS).map((option) => {
							const selected =
								room.settings.preset === "words"
									? room.settings.wordCount === option
									: room.settings.quoteLength === option;
							return (
								<button
									key={option}
									type="button"
									disabled={!isHost}
									onClick={() =>
										room.settings.preset === "words"
											? updateSettings({ wordCount: option as WordsOption })
											: updateSettings({ quoteLength: option as QuoteOption })
									}
									className={segmentedItemClass(selected)}
								>
									{option}
								</button>
							);
						})}
					</div>
					{room.settings.preset === "words" && (
						<button
							type="button"
							disabled={!isHost}
							onClick={() =>
								updateSettings({
									punctuationEnabled: !room.settings.punctuationEnabled,
								})
							}
							className={segmentedItemClass(room.settings.punctuationEnabled)}
						>
							punctuation
						</button>
					)}
				</div>
			</div>

			<div className="mx-auto w-full max-w-xl">
				<PlayerList room={room} currentPlayerId={currentPlayerId} />
			</div>

			<div className="flex justify-center">
				<button
					type="button"
					onClick={() => onReady(!currentPlayer?.ready)}
					className={`min-w-28 rounded-md border border-(--accent) px-5 py-2 transition ${
						currentPlayer?.ready
							? "bg-(--accent) text-(--bg)"
							: "text-(--accent) hover:bg-(--accent)/10"
					}`}
				>
					{currentPlayer?.ready ? "ready ✓" : "I'm ready"}
				</button>
			</div>
		</section>
	);
}
