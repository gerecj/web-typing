import { describe, expect, it } from "vitest";
import { getNextRoomDeadline } from "./deadlines";
import { createRoomState } from "./room-state";

describe("room deadlines", () => {
	it("selects the countdown start before room expiry", () => {
		const state = createRoomState("ABCD2345", 0, 20_000);
		state.phase = "countdown";
		state.round = {
			id: "round-1",
			text: "cat",
			startsAt: 5_000,
			deadlineAt: 15_000,
		};

		expect(getNextRoomDeadline(state, 1_000)).toBe(5_000);
	});

	it("selects the race deadline before room expiry", () => {
		const state = createRoomState("ABCD2345", 0, 20_000);
		state.phase = "racing";
		state.round = {
			id: "round-1",
			text: "cat",
			startsAt: 5_000,
			deadlineAt: 15_000,
		};

		expect(getNextRoomDeadline(state, 6_000)).toBe(15_000);
	});

	it("ignores elapsed deadlines and returns null after room expiry", () => {
		const state = createRoomState("ABCD2345", 0, 20_000);
		expect(getNextRoomDeadline(state, 19_000)).toBe(20_000);
		expect(getNextRoomDeadline(state, 20_000)).toBeNull();
	});
});
