import type { RoomSnapshot } from "../../lib/race/protocol";

const DEFAULT_PLAYER_GAP_PX = 20;
const MIN_PLAYER_GAP_PX = 1;

interface RaceProgressProps {
	room: RoomSnapshot;
	textLength: number;
	currentPlayerId: string | null;
	localCharIndex: number;
	localCorrectCharacters: number;
	localWpm: number;
}

export function RaceProgress({
	room,
	textLength,
	currentPlayerId,
	localCharIndex,
	localCorrectCharacters,
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
				const correctCharacters =
					player.id === currentPlayerId ? localCorrectCharacters : player.correctCharacters;
				const correctProgress =
					textLength === 0 ? 0 : Math.min(progress, (correctCharacters / textLength) * 100);
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
						<div className="h-1.5 overflow-hidden rounded-full bg-(--text-muted)/15">
							<div
								className="relative h-full rounded-full bg-(--text-error) transition-[width] duration-100"
								style={{ width: `${progress}%` }}
							>
								<div
									className="h-full bg-(--accent) transition-[width] duration-100"
									style={{
										width: progress === 0 ? "0%" : `${(correctProgress / progress) * 100}%`,
									}}
								/>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
