import { describe, expect, it } from "vitest";
import type { RaceSettings } from "../lib/race/protocol";
import {
	createRoomState,
	DEFAULT_RACE_SETTINGS,
	type RoomPlayer,
	type RoomState,
} from "./room-state";
import { transitionRoom } from "./state-machine";

function player(id: string, ready = false): RoomPlayer {
	return {
		id,
		name: id,
		connected: true,
		ready,
		repeatReady: false,
		charIndex: 0,
		totalInputs: 0,
		correctInputs: 0,
		correctCharacters: 0,
		place: null,
		wpm: null,
		accuracy: null,
		finishedAt: null,
		didNotFinish: false,
	};
}

function waitingRoom(): RoomState {
	let state = createRoomState("ABCD", 0, 60_000);
	state = transitionRoom(state, { type: "join", player: player("one", true), now: 1 }).state;
	state = transitionRoom(state, { type: "join", player: player("two", true), now: 2 }).state;
	return state;
}

function racingRoom(): RoomState {
	const state = waitingRoom();
	const countdown = transitionRoom(state, {
		type: "start_round",
		round: { id: "round-1", text: "cat", startsAt: 1_000, deadlineAt: 10_000 },
		now: 100,
	}).state;
	return transitionRoom(countdown, { type: "advance_time", now: 1_000 }).state;
}

describe("race room state machine", () => {
	it("assigns the first player as host and caps a room at six players", () => {
		let state = createRoomState("ABCD", 0, 60_000);
		for (let index = 1; index <= 6; index++) {
			state = transitionRoom(state, {
				type: "join",
				player: player(`p${index}`),
				now: index,
			}).state;
		}

		expect(state.hostPlayerId).toBe("p1");
		expect(transitionRoom(state, { type: "join", player: player("p7"), now: 7 }).error).toBe(
			"lobby_full",
		);
	});

	it("requests a round automatically once every player is ready", () => {
		let state = createRoomState("ABCD", 0, 60_000);
		state = transitionRoom(state, { type: "join", player: player("one"), now: 1 }).state;
		state = transitionRoom(state, { type: "join", player: player("two"), now: 2 }).state;

		const first = transitionRoom(state, {
			type: "set_ready",
			playerId: "one",
			ready: true,
			now: 10,
		});
		const second = transitionRoom(first.state, {
			type: "set_ready",
			playerId: "two",
			ready: true,
			now: 11,
		});
		expect(first.effects.some((effect) => effect.type === "round_requested")).toBe(false);
		expect(second.effects.some((effect) => effect.type === "round_requested")).toBe(true);

		const result = transitionRoom(second.state, {
			type: "start_round",
			round: { id: "round-1", text: "cat", startsAt: 1_000, deadlineAt: 2_000 },
			now: 100,
		});
		expect(result.state.phase).toBe("countdown");
	});

	it("allows a one-player lobby to request a round when ready", () => {
		let state = createRoomState("ABCD", 0, 60_000);
		state = transitionRoom(state, { type: "join", player: player("one"), now: 1 }).state;
		const result = transitionRoom(state, {
			type: "set_ready",
			playerId: "one",
			ready: true,
			now: 2,
		});

		expect(result.effects.some((effect) => effect.type === "round_requested")).toBe(true);
	});

	it("rejects stale rounds and impossible progress", () => {
		const state = racingRoom();
		expect(
			transitionRoom(state, {
				type: "progress",
				playerId: "one",
				roundId: "old-round",
				charIndex: 1,
				totalInputs: 1,
				correctInputs: 1,
				correctCharacters: 1,
				now: 1_100,
			}).error,
		).toBe("invalid_round");
		expect(
			transitionRoom(state, {
				type: "progress",
				playerId: "one",
				roundId: "round-1",
				charIndex: 2,
				totalInputs: 2,
				correctInputs: 1,
				correctCharacters: 3,
				now: 1_100,
			}).error,
		).toBe("invalid_progress");
		expect(
			transitionRoom(state, {
				type: "finish",
				playerId: "one",
				roundId: "round-1",
				charIndex: 3,
				totalInputs: 3,
				correctInputs: 3,
				correctCharacters: 3,
				now: 1_001,
			}).error,
		).toBe("invalid_progress");
	});

	it("allows progress to move backward after an edit", () => {
		let state = racingRoom();
		state = transitionRoom(state, {
			type: "progress",
			playerId: "one",
			roundId: "round-1",
			charIndex: 2,
			totalInputs: 2,
			correctInputs: 2,
			correctCharacters: 2,
			now: 1_100,
		}).state;
		const result = transitionRoom(state, {
			type: "progress",
			playerId: "one",
			roundId: "round-1",
			charIndex: 1,
			totalInputs: 2,
			correctInputs: 2,
			correctCharacters: 1,
			now: 1_200,
		});

		expect(result.error).toBeUndefined();
		expect(result.state.players.one).toMatchObject({
			charIndex: 1,
			correctCharacters: 1,
			wpm: 60,
		});
		expect(result.effects).toContainEqual({
			type: "progress_changed",
			playerId: "one",
			roundId: "round-1",
			charIndex: 1,
			correctCharacters: 1,
			wpm: 60,
		});
	});

	it("assigns finish order and server-derived results", () => {
		let state = racingRoom();
		state = transitionRoom(state, {
			type: "finish",
			playerId: "two",
			roundId: "round-1",
			charIndex: 3,
			totalInputs: 4,
			correctInputs: 3,
			correctCharacters: 2,
			now: 2_000,
		}).state;
		const result = transitionRoom(state, {
			type: "finish",
			playerId: "one",
			roundId: "round-1",
			charIndex: 3,
			totalInputs: 3,
			correctInputs: 3,
			correctCharacters: 3,
			now: 3_000,
		});

		expect(result.state.phase).toBe("results");
		expect(result.state.players.two).toMatchObject({ place: 1, accuracy: 75, wpm: 24 });
		expect(result.state.players.one).toMatchObject({ place: 2, accuracy: 100, wpm: 18 });
		expect(result.effects).toContainEqual({
			type: "player_finished",
			playerId: "one",
			roundId: "round-1",
			charIndex: 3,
			correctCharacters: 3,
			place: 2,
			wpm: 18,
			accuracy: 100,
		});
	});

	it("removes a player who leaves the waiting lobby and transfers host authority", () => {
		const state = waitingRoom();
		const result = transitionRoom(state, {
			type: "disconnect",
			playerId: "one",
			now: 100,
		});

		expect(result.state.players.one).toBeUndefined();
		expect(result.state.hostPlayerId).toBe("two");
	});

	it("keeps a countdown running when one of two players leaves", () => {
		const state = transitionRoom(waitingRoom(), {
			type: "start_round",
			round: { id: "round-1", text: "cat", startsAt: 1_000, deadlineAt: 10_000 },
			now: 100,
		}).state;
		const result = transitionRoom(state, {
			type: "disconnect",
			playerId: "two",
			now: 200,
		});

		expect(result.state.phase).toBe("countdown");
		expect(result.state.round?.id).toBe("round-1");
		expect(Object.keys(result.state.players)).toEqual(["one"]);
	});

	it("marks a disconnected racer DNF and lets the survivor request a rematch", () => {
		let state = racingRoom();
		state = transitionRoom(state, {
			type: "finish",
			playerId: "one",
			roundId: "round-1",
			charIndex: 3,
			totalInputs: 3,
			correctInputs: 3,
			correctCharacters: 3,
			now: 2_000,
		}).state;
		state = transitionRoom(state, {
			type: "disconnect",
			playerId: "two",
			now: 2_100,
		}).state;

		expect(state.phase).toBe("results");
		expect(state.players.two.didNotFinish).toBe(true);

		const repeat = transitionRoom(state, {
			type: "set_repeat",
			playerId: "one",
			ready: true,
			now: 2_200,
		});
		expect(repeat.state.phase).toBe("results");
		expect(repeat.effects.some((effect) => effect.type === "round_requested")).toBe(true);

		const restarted = transitionRoom(repeat.state, {
			type: "start_round",
			round: { id: "round-2", text: "dog", startsAt: 3_000, deadlineAt: 10_000 },
			now: 2_300,
		});
		expect(restarted.state.phase).toBe("countdown");
		expect(restarted.state.players.two).toBeUndefined();
	});

	it("requests a rematch only after every remaining player repeats", () => {
		let state = racingRoom();
		for (const [playerId, now] of [
			["one", 2_000],
			["two", 3_000],
		] as const) {
			state = transitionRoom(state, {
				type: "finish",
				playerId,
				roundId: "round-1",
				charIndex: 3,
				totalInputs: 3,
				correctInputs: 3,
				correctCharacters: 3,
				now,
			}).state;
		}

		const first = transitionRoom(state, {
			type: "set_repeat",
			playerId: "one",
			ready: true,
			now: 4_000,
		});
		const second = transitionRoom(first.state, {
			type: "set_repeat",
			playerId: "two",
			ready: true,
			now: 4_001,
		});

		expect(first.effects.some((effect) => effect.type === "round_requested")).toBe(false);
		expect(second.effects.some((effect) => effect.type === "round_requested")).toBe(true);
	});

	it("lets a player join during results but not mid-race", () => {
		let state = racingRoom();
		expect(transitionRoom(state, { type: "join", player: player("late"), now: 1_500 }).error).toBe(
			"invalid_phase",
		);

		for (const playerId of ["one", "two"]) {
			state = transitionRoom(state, {
				type: "finish",
				playerId,
				roundId: "round-1",
				charIndex: 3,
				totalInputs: 3,
				correctInputs: 3,
				correctCharacters: 3,
				now: 2_000,
			}).state;
		}
		const joined = transitionRoom(state, { type: "join", player: player("late"), now: 3_000 });
		expect(joined.error).toBeUndefined();

		state = joined.state;
		for (const playerId of ["one", "two"]) {
			state = transitionRoom(state, {
				type: "set_repeat",
				playerId,
				ready: true,
				now: 4_000,
			}).state;
		}
		const last = transitionRoom(state, {
			type: "set_repeat",
			playerId: "late",
			ready: true,
			now: 4_001,
		});
		expect(last.effects.some((effect) => effect.type === "round_requested")).toBe(true);
	});

	it("starts a rematch when an unready results player leaves two ready players", () => {
		let state = waitingRoom();
		state = transitionRoom(state, { type: "join", player: player("three", true), now: 3 }).state;
		state = transitionRoom(state, {
			type: "start_round",
			round: { id: "round-1", text: "cat", startsAt: 1_000, deadlineAt: 10_000 },
			now: 100,
		}).state;
		state = transitionRoom(state, { type: "advance_time", now: 1_000 }).state;
		for (const [playerId, now] of [
			["one", 2_000],
			["two", 2_100],
			["three", 2_200],
		] as const) {
			state = transitionRoom(state, {
				type: "finish",
				playerId,
				roundId: "round-1",
				charIndex: 3,
				totalInputs: 3,
				correctInputs: 3,
				correctCharacters: 3,
				now,
			}).state;
		}
		state = transitionRoom(state, {
			type: "set_repeat",
			playerId: "one",
			ready: true,
			now: 3_000,
		}).state;
		state = transitionRoom(state, {
			type: "set_repeat",
			playerId: "two",
			ready: true,
			now: 3_001,
		}).state;

		const result = transitionRoom(state, {
			type: "disconnect",
			playerId: "three",
			now: 3_002,
		});
		expect(result.state.players.three).toBeUndefined();
		expect(result.effects.some((effect) => effect.type === "round_requested")).toBe(true);
	});

	it("allows only the host to change settings", () => {
		const state = waitingRoom();
		const settings: RaceSettings = { ...DEFAULT_RACE_SETTINGS, wordCount: 60 };
		expect(
			transitionRoom(state, {
				type: "set_settings",
				playerId: "two",
				settings,
				now: 10,
			}).error,
		).toBe("not_host");
		expect(
			transitionRoom(state, {
				type: "set_settings",
				playerId: "one",
				settings,
				now: 10,
			}).state.settings.wordCount,
		).toBe(60);
	});
});
