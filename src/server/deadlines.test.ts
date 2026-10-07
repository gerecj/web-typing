import { describe, expect, it } from "vitest";
import { getNextRoomDeadline } from "./deadlines";
import { createRoomState } from "./room-state";

describe("room deadlines", () => {
	it("wakes the room at its next pending deadline", () => {
		const state = createRoomState("ABCD2345", 0, 20_000);
		state.round = { id: "round-1", text: "cat", startsAt: 5_000, deadlineAt: 15_000 };

		state.phase = "countdown";
		expect(getNextRoomDeadline(state, 1_000)).toBe(5_000);
		state.phase = "racing";
		expect(getNextRoomDeadline(state, 6_000)).toBe(15_000);
		state.phase = "results";
		expect(getNextRoomDeadline(state, 16_000)).toBe(20_000);
		expect(getNextRoomDeadline(state, 20_000)).toBeNull();
	});
});
