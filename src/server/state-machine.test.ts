import { describe, expect, it } from "vitest";
import type { ProgressReport } from "../lib/race/protocol";
import { createRoomPlayer, createRoomState, type RoomState } from "./room-state";
import { type RoomEvent, type TransitionResult, transitionRoom } from "./state-machine";

const TEXT = "cat";

function apply(state: RoomState, ...events: RoomEvent[]): RoomState {
	return events.reduce((current, event) => {
		const result = transitionRoom(current, event);
		expect(result.error).toBeUndefined();
		return result.state;
	}, state);
}

const requestsRound = (result: TransitionResult) =>
	result.effects.some((effect) => effect.type === "round_requested");
const join = (playerId: string): RoomEvent => ({
	type: "join",
	player: createRoomPlayer(playerId, playerId),
	now: 0,
});
const ready = (playerId: string): RoomEvent => ({
	type: "set_ready",
	playerId,
	ready: true,
	now: 0,
});
const repeat = (playerId: string): RoomEvent => ({
	type: "set_repeat",
	playerId,
	ready: true,
	now: 5_000,
});
const leave = (playerId: string, now: number): RoomEvent => ({ type: "disconnect", playerId, now });

/** Defaults to a clean finish of the whole passage. */
function report(
	type: "progress" | "finish",
	playerId: string,
	now: number,
	overrides: Partial<ProgressReport> = {},
): RoomEvent {
	return {
		type,
		playerId,
		now,
		roundId: "round-1",
		charIndex: TEXT.length,
		totalInputs: TEXT.length,
		correctInputs: TEXT.length,
		correctCharacters: TEXT.length,
		errorRanges: [],
		...overrides,
	};
}

/** Players racing on TEXT, started at t=1000. */
function racingRoom(...playerIds: string[]): RoomState {
	return apply(
		createRoomState("ABCD2345", 0, 60_000),
		...playerIds.map(join),
		...playerIds.map(ready),
		{
			type: "start_round",
			round: { id: "round-1", text: TEXT, startsAt: 1_000, deadlineAt: 10_000 },
			now: 100,
		},
		{ type: "advance_time", now: 1_000 },
	);
}

describe("race room state machine", () => {
	it("starts a round once every player is ready", () => {
		const lobby = apply(createRoomState("ABCD2345", 0, 60_000), join("one"), join("two"));
		const first = transitionRoom(lobby, ready("one"));
		expect(requestsRound(first)).toBe(false);
		expect(requestsRound(transitionRoom(first.state, ready("two")))).toBe(true);
	});

	it("lets players join between races but not mid-race, up to six", () => {
		const racing = racingRoom("one", "two");
		expect(transitionRoom(racing, join("late")).error).toBe("invalid_phase");
		const results = apply(racing, report("finish", "one", 2_000), report("finish", "two", 2_000));
		expect(transitionRoom(results, join("late")).error).toBeUndefined();

		const full = apply(
			createRoomState("ABCD2345", 0, 60_000),
			...["1", "2", "3", "4", "5", "6"].map(join),
		);
		expect(transitionRoom(full, join("7")).error).toBe("lobby_full");
	});

	it("rejects stale or impossible progress but accepts edits that move backward", () => {
		const racing = racingRoom("one");
		const typed = { charIndex: 2, totalInputs: 2, correctInputs: 2, correctCharacters: 2 };
		expect(
			transitionRoom(racing, report("progress", "one", 1_100, { ...typed, roundId: "old" })).error,
		).toBe("invalid_round");
		expect(
			transitionRoom(racing, report("progress", "one", 1_100, { ...typed, correctCharacters: 3 }))
				.error,
		).toBe("invalid_progress");
		// Finishing one millisecond after the start would be far beyond human speed.
		expect(transitionRoom(racing, report("finish", "one", 1_001)).error).toBe("invalid_progress");

		const edited = transitionRoom(
			apply(racing, report("progress", "one", 1_100, typed)),
			report("progress", "one", 1_200, { ...typed, charIndex: 1, correctCharacters: 1 }),
		);
		expect(edited.error).toBeUndefined();
		expect(edited.state.players.one.charIndex).toBe(1);
	});

	it("ranks by wpm, then accuracy, not by who finished first", () => {
		const firstFinish = apply(
			racingRoom("sloppy", "steady", "careful"),
			report("finish", "sloppy", 2_000, {
				correctInputs: 1,
				correctCharacters: 1,
				errorRanges: [[1, 3]],
			}),
		);
		// Places are only assigned once everyone is done.
		expect(firstFinish.players.sloppy).toMatchObject({ wpm: 12, place: null });

		const results = apply(
			firstFinish,
			report("finish", "steady", 3_000, { totalInputs: 4 }),
			report("finish", "careful", 3_000),
		);
		expect(results.phase).toBe("results");
		expect(results.players.careful).toMatchObject({ place: 1, wpm: 18, accuracy: 100 });
		expect(results.players.steady).toMatchObject({ place: 2, wpm: 18, accuracy: 75 });
		expect(results.players.sloppy).toMatchObject({ place: 3, wpm: 12, accuracy: 33 });
	});

	it("marks a racer who leaves mid-race DNF and still lets the rest rematch", () => {
		const results = apply(
			racingRoom("one", "two"),
			report("finish", "one", 2_000),
			leave("two", 2_100),
		);
		expect(results.phase).toBe("results");
		expect(results.players.one.place).toBe(1);
		expect(results.players.two).toMatchObject({ didNotFinish: true, place: null });

		const rematch = transitionRoom(results, repeat("one"));
		expect(requestsRound(rematch)).toBe(true);
		const next = apply(rematch.state, {
			type: "start_round",
			round: { id: "round-2", text: "dog", startsAt: 7_000, deadlineAt: 20_000 },
			now: 5_100,
		});
		expect(Object.keys(next.players)).toEqual(["one"]);
	});

	it("rematches once every remaining player repeats, including when the holdout leaves", () => {
		const results = apply(
			racingRoom("one", "two", "three"),
			...["one", "two", "three"].map((id) => report("finish", id, 2_000)),
		);
		const twoReady = apply(results, repeat("one"));
		const allButOne = transitionRoom(twoReady, repeat("two"));
		expect(requestsRound(allButOne)).toBe(false);
		expect(requestsRound(transitionRoom(allButOne.state, leave("three", 5_100)))).toBe(true);
	});
});
