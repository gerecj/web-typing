export type TypingStatus = "idle" | "typing" | "finished";

export interface TypingState {
	text: string;
	input: string;
	totalInputs: number;
	correctInputs: number;
	startTime: number | null;
	endTime: number | null;
	status: TypingStatus;
}

export type TypingAction =
	| { type: "CHAR"; key: string; time: number }
	| { type: "BACKSPACE" }
	| { type: "CTRL_BACKSPACE" }
	| { type: "RESET"; text: string };

export const initialTypingState: TypingState = {
	text: "",
	input: "",
	totalInputs: 0,
	correctInputs: 0,
	startTime: null,
	endTime: null,
	status: "idle",
};

export function typingReducer(state: TypingState, action: TypingAction): TypingState {
	switch (action.type) {
		case "RESET":
			return { ...initialTypingState, text: action.text };

		case "CHAR": {
			if (state.status === "finished") return state;
			if (state.input.length >= state.text.length) return state;

			const newInput = state.input + action.key;
			const isCorrect = action.key === state.text[state.input.length];
			const isFinished = newInput.length === state.text.length;

			return {
				...state,
				input: newInput,
				totalInputs: state.totalInputs + 1,
				correctInputs: state.correctInputs + (isCorrect ? 1 : 0),
				startTime: state.startTime ?? action.time,
				endTime: isFinished ? action.time : null,
				status: isFinished ? "finished" : "typing",
			};
		}

		case "BACKSPACE": {
			if (state.status === "finished") return state;
			if (state.input.length === 0) return state;

			return {
				...state,
				input: state.input.slice(0, -1),
			};
		}

		case "CTRL_BACKSPACE": {
			if (state.status === "finished") return state;
			if (state.input.length === 0) return state;

			return {
				...state,
				input: state.input.replace(/\S+\s*$/, ""),
			};
		}
	}
}
