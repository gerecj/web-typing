import type { ErrorRange } from "../../lib/race/error-ranges";
import type { RoomSnapshot } from "../../lib/race/protocol";

const DEFAULT_PLAYER_GAP_PX = 20;
const MIN_PLAYER_GAP_PX = 1;

interface RaceProgressProps {
	room: RoomSnapshot;
	textLength: number;
	currentPlayerId: string | null;
	localCharIndex: number;
	localErrorRanges: ErrorRange[];
	localWpm: number;
}

export function RaceProgress({
	room,
	textLength,
	currentPlayerId,
	localCharIndex,
	localErrorRanges,
	localWpm,
}: RaceProgressProps) {
	const playerCount = room.players.length;
	const playerGap =
		playerCount <= 1
			? `${DEFAULT_PLAYER_GAP_PX}px`
			: `max(${MIN_PLAYER_GAP_PX}px, calc(${DEFAULT_PLAYER_GAP_PX}px - var(--typing-top-compression, 0px) / ${
					playerCount - 1
				}))`;

	return (
		<div className="grid" style={{ rowGap: playerGap }}>
			{room.players.map((player) => {
				const charIndex = player.id === currentPlayerId ? localCharIndex : player.charIndex;
				const progress = textLength === 0 ? 0 : Math.min(100, (charIndex / textLength) * 100);
				const errorRanges = player.id === currentPlayerId ? localErrorRanges : player.errorRanges;
				const wpm = player.id === currentPlayerId ? localWpm : (player.wpm ?? 0);
				return (
					<div key={player.id} className="space-y-1">
						<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
							<div className="relative h-4 min-w-0">
								<span
									className={`absolute max-w-full truncate whitespace-nowrap transition-[left,transform] duration-100 ${
										player.id === currentPlayerId ? "text-(--accent)" : "text-(--text)"
									}`}
									style={{
										left: `${progress}%`,
										transform: `translateX(-${progress}%)`,
									}}
								>
									{player.name}
								</span>
							</div>
							<span className="text-(--text-muted)">{wpm} wpm</span>
						</div>
						<div className="relative h-1.5 overflow-hidden rounded-full bg-(--text-muted)/15">
							<div
								className="h-full rounded-full bg-(--accent) transition-[width] duration-100"
								style={{ width: `${progress}%` }}
							/>
							{/* Mistakes stay pinned to where they are in the passage. */}
							{textLength > 0 &&
								errorRanges.map(([start, end]) => (
									<div
										key={start}
										className="absolute inset-y-0 min-w-0.5 bg-(--text-error)"
										style={{
											left: `${(start / textLength) * 100}%`,
											width: `${((end - start) / textLength) * 100}%`,
										}}
									/>
								))}
						</div>
					</div>
				);
			})}
		</div>
	);
}
