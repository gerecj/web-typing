import type { RoomState } from "./room-state";

export function getNextRoomDeadline(state: RoomState, now: number): number | null {
	const deadlines = [state.expiresAt];
	if (state.phase === "countdown" && state.round) deadlines.push(state.round.startsAt);
	if (state.phase === "racing" && state.round) deadlines.push(state.round.deadlineAt);

	const futureDeadlines = deadlines.filter((deadline) => deadline > now);
	return futureDeadlines.length > 0 ? Math.min(...futureDeadlines) : null;
}
