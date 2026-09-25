import { type FormEvent, type SyntheticEvent, useEffect, useRef } from "react";
import type { useTyping } from "../hooks/useTyping";
import { useTypingViewport } from "../hooks/useTypingViewport";

interface WordsProps {
	typing: ReturnType<typeof useTyping>;
}

const CHAR_WINDOW = 200;
const CURSOR_TRANSITION_MS = 100;
// Kept in the hidden input so a touch keyboard Backspace always has something to delete.
const INPUT_RESTING_VALUE = " ";

function getCharacterClass(typing: ReturnType<typeof useTyping>, absoluteIndex: number): string {
	let className = "text-(--text-muted)";
	if (absoluteIndex < typing.currentIndex) {
		className = typing.correctKeys[absoluteIndex] ? "text-(--text)" : "text-(--text-error)";
		if (typing.wordCorrectness[absoluteIndex] === false) {
			className +=
				" underline decoration-(--error-decoration) decoration-[1.5px] underline-offset-3";
		}
	}
	return className;
}

// Invisible input over the words, so tapping them opens the keyboard on phones.
function TypingInput({ typing }: WordsProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const previousValueRef = useRef(INPUT_RESTING_VALUE);

	// Close the phone keyboard when finished, so the results and settings are visible again.
	useEffect(() => {
		if (typing.status === "finished") inputRef.current?.blur();
	}, [typing.status]);

	function handleInput(event: FormEvent<HTMLInputElement>) {
		const input = event.currentTarget;
		const { inputType, isComposing } = event.nativeEvent as InputEvent;
		if (inputType === "insertFromPaste") {
			input.value = previousValueRef.current;
			return;
		}

		// Diff against the previous value, which also works with autocorrect and IME compositions.
		const previous = previousValueRef.current;
		const next = input.value;
		let common = 0;
		while (common < previous.length && previous[common] === next[common]) common++;
		for (let i = common; i < previous.length; i++) typing.deleteCharacter();
		for (const char of next.slice(common)) typing.typeCharacter(char);
		previousValueRef.current = next;

		if (!isComposing && (next.length === 0 || next.endsWith(" "))) {
			input.value = INPUT_RESTING_VALUE;
			previousValueRef.current = INPUT_RESTING_VALUE;
		}
	}

	function keepCaretAtEnd(event: SyntheticEvent<HTMLInputElement>) {
		const input = event.currentTarget;
		const end = input.value.length;
		if (input.selectionStart !== end) input.setSelectionRange(end, end);
	}

	return (
		<input
			ref={inputRef}
			data-typing-input
			aria-label="Typing input"
			defaultValue={INPUT_RESTING_VALUE}
			autoCapitalize="off"
			autoComplete="off"
			autoCorrect="off"
			spellCheck={false}
			onInput={handleInput}
			onSelect={keepCaretAtEnd}
			className="absolute inset-0 z-10 h-full w-full cursor-default text-base opacity-0"
		/>
	);
}

export function Words({ typing }: WordsProps) {
	const { renderChars, cursorRef, assignCurrentCharRef } = useTypingViewport(typing, {
		charWindow: CHAR_WINDOW,
		cursorTransitionMs: CURSOR_TRANSITION_MS,
	});
	const cursorClass = `absolute top-0 left-0 w-0.5 rounded-full bg-(--accent) ${
		typing.status === "idle" ? "animate-cursor-blink" : ""
	}`;
	if (!typing.enabled) return null;

	return (
		<div>
			<div className="relative">
				{/* Progress */}
				<div className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2 text-(--accent) text-2xl">
					{typing.mode === "time"
						? `${Math.max(0, Math.ceil(typing.timeLeftMs / 1000))}`
						: `${typing.typedWords}/${typing.totalWords}`}
				</div>

				{/* Words */}
				<div className="wrap-break-word relative h-[calc(3lh)] overflow-hidden whitespace-pre-wrap text-2xl leading-normal md:text-3xl">
					{renderChars.map(({ char, absoluteIndex }) => {
						return (
							<span
								key={`${absoluteIndex}-${char}`}
								ref={(node) => assignCurrentCharRef(absoluteIndex, node)}
								className={getCharacterClass(typing, absoluteIndex)}
							>
								{char}
							</span>
						);
					})}

					{/* Cursor */}
					{typing.status !== "finished" && <span ref={cursorRef} className={cursorClass} />}
				</div>
				<TypingInput typing={typing} />
				{/* <div className="pointer-events-none absolute top-full left-0 mt-4 text-(--text-muted) text-xs">
					debug correct words: {typing.correctWords}
				</div> */}
			</div>
		</div>
	);
}
