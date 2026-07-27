import type { RoomSnapshot } from "../../lib/race/protocol";

interface RaceResultsProps {
	room: RoomSnapshot;
	currentPlayerId: string | null;
	onRepeat: (ready: boolean) => void;
}

export function RaceResults({ room, currentPlayerId, onRepeat }: RaceResultsProps) {
	const currentPlayer = room.players.find((player) => player.id === currentPlayerId);
	const standings = [...room.players].sort(
		(left, right) =>
			(left.place ?? Number.POSITIVE_INFINITY) - (right.place ?? Number.POSITIVE_INFINITY),
	);

	return (
		<section className="w-full max-w-2xl space-y-6 rounded-xl border border-(--text-muted)/20 p-6">
			<header className="text-center">
				<p className="text-(--text-muted) text-sm">race complete</p>
				<h1 className="font-bold text-(--accent) text-3xl">results</h1>
			</header>

			<ol className="space-y-2">
				{standings.map((player) => (
					<li
						key={player.id}
						className="grid grid-cols-[3rem_1fr_auto_auto] items-center gap-3 rounded-md border border-(--text-muted)/20 px-3 py-3"
					>
						<span className="font-bold text-(--accent)">
							{player.place === null ? "DNF" : `#${player.place}`}
						</span>
						<span className="text-(--text)">
							{player.name}
							{player.id === currentPlayerId ? " (you)" : ""}
						</span>
						<span className="text-(--text-muted)">
							{player.wpm === null ? "—" : `${player.wpm} wpm`}
						</span>
						<span className="text-(--text-muted)">
							{player.accuracy === null ? "—" : `${player.accuracy}%`}
						</span>
					</li>
				))}
			</ol>

			<div className="text-center">
				<button
					type="button"
					onClick={() => onRepeat(!currentPlayer?.repeatReady)}
					className={`rounded-md px-5 py-2 transition ${
						currentPlayer?.repeatReady
							? "bg-(--accent) text-(--bg)"
							: "border border-(--accent) text-(--accent) hover:bg-(--accent)/10"
					}`}
				>
					{currentPlayer?.repeatReady ? "waiting for others…" : "race again"}
				</button>
			</div>
		</section>
	);
}
