import type { RoomSnapshot } from "../../lib/race/protocol";

interface PlayerListProps {
	room: RoomSnapshot;
	currentPlayerId: string | null;
}

export function PlayerList({ room, currentPlayerId }: PlayerListProps) {
	return (
		<ul className="space-y-2">
			{room.players.map((player) => (
				<li
					key={player.id}
					className="flex items-center justify-between gap-4 rounded-md border border-(--text-muted)/20 px-3 py-2"
				>
					<span className={player.connected ? "text-(--text)" : "text-(--text-muted)"}>
						{player.name}
						{player.id === currentPlayerId ? " (you)" : ""}
						{player.id === room.hostPlayerId ? " · host" : ""}
					</span>
					<span className={player.ready ? "text-(--accent)" : "text-(--text-muted)"}>
						{player.connected ? (player.ready ? "ready" : "waiting") : "left race"}
					</span>
				</li>
			))}
		</ul>
	);
}
