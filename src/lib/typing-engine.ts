export type TypingStatus = "idle" | "typing" | "finished";
export type InputPolicy = "free" | "strict";

export interface TypingState {
	text: string;
	input: string;
	totalInputs: number;
	correctInputs: number;
	startTime: number | null;
	endTime: number | null;
	lastInputTime: number | null;
	status: TypingStatus;
	inputPolicy: InputPolicy;
}

export type TypingAction =
	| { type: "CHAR"; key: string; time: number }
	| { type: "BACKSPACE" }
	| { type: "CTRL_BACKSPACE" }
	| { type: "FINISH"; time: number }
	| {
			type: "RESET";
			text: string;
			inputPolicy?: InputPolicy;
			startTime?: number | null;
	  };

export const initialTypingState: TypingState = {
	text: "",
	input: "",
	totalInputs: 0,
	correctInputs: 0,
	startTime: null,
	endTime: null,
	lastInputTime: null,
	status: "idle",
	inputPolicy: "free",
};

export function typingReducer(state: TypingState, action: TypingAction): TypingState {
	switch (action.type) {
		case "RESET":
			return {
				...initialTypingState,
				text: action.text,
				inputPolicy: action.inputPolicy ?? "free",
				startTime: action.startTime ?? null,
			};

		case "CHAR": {
			if (state.status === "finished") return state;
			if (state.input.length >= state.text.length) return state;
			if (state.startTime !== null && action.time < state.startTime) return state;

			const isCorrect = action.key === state.text[state.input.length];
			const shouldAdvance = state.inputPolicy === "free" || isCorrect;
			const newInput = shouldAdvance ? state.input + action.key : state.input;
			const isFinished = newInput.length === state.text.length;

			return {
				...state,
				input: newInput,
				totalInputs: state.totalInputs + 1,
				correctInputs: state.correctInputs + (isCorrect ? 1 : 0),
				startTime: state.startTime ?? action.time,
				endTime: isFinished ? action.time : null,
				lastInputTime: action.time,
				status: isFinished ? "finished" : "typing",
			};
		}

		case "BACKSPACE": {
			if (state.status === "finished") return state;
			if (state.inputPolicy === "strict") return state;
			if (state.input.length === 0) return state;

			return {
				...state,
				input: state.input.slice(0, -1),
			};
		}

		case "CTRL_BACKSPACE": {
			if (state.status === "finished") return state;
			if (state.inputPolicy === "strict") return state;
			if (state.input.length === 0) return state;

			return {
				...state,
				input: state.input.replace(/\S+\s*$/, ""),
			};
		}

		case "FINISH": {
			if (state.status === "finished") return state;
			if (state.startTime === null) return state;

			return {
				...state,
				endTime: action.time,
				status: "finished",
			};
		}
	}
}
