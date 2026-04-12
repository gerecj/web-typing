import type { useTyping } from "../hooks/useTyping";
import { useTypingViewport } from "../hooks/useTypingViewport";

interface WordsProps {
	typing: ReturnType<typeof useTyping>;
}

const CHAR_WINDOW = 200;
const CURSOR_TRANSITION_MS = 100;

function getCharacterClass(typing: ReturnType<typeof useTyping>, absoluteIndex: number): string {
	let className = "text-(--text-muted)";
	if (absoluteIndex < typing.currentIndex) {
		className = typing.correctKeys[absoluteIndex] ? "text-(--text)" : "text-(--text-error)";
		if (typing.wordCorrectness[absoluteIndex] === false) {
			className +=
				" underline decoration-(--error-decoration) decoration-[1.5px] underline-offset-2";
		}
	}
	return className;
}

export function Words({ typing }: WordsProps) {
	const { renderChars, cursorRef, assignCurrentCharRef } = useTypingViewport(typing, {
		charWindow: CHAR_WINDOW,
		cursorTransitionMs: CURSOR_TRANSITION_MS,
	});
	const cursorClass =
		typing.status === "idle"
			? "absolute top-0 left-0 w-0.5 rounded-full bg-(--accent) animate-cursor-blink"
			: "absolute top-0 left-0 w-0.5 rounded-full bg-(--accent)";

	return (
		<div className="w-full max-w-3xl px-4">
			<div className="relative">
				{/* Progress */}
				<div className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2 text-(--accent) text-2xl">
					{typing.mode === "time"
						? `${Math.max(0, Math.ceil(typing.timeLeftMs / 1000))}`
						: `${typing.typedWords}/${typing.numWords}`}
				</div>

				{/* Words */}
				<div
					className="wrap-break-word relative overflow-hidden whitespace-pre-wrap text-3xl leading-relaxed"
					style={{ height: "calc(1.6em * 3)" }}
				>
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
				{/* <div className="pointer-events-none absolute top-full left-0 mt-4 text-(--text-muted) text-xs">
					debug correct words: {typing.correctWords}
				</div> */}
			</div>

			{/* Results */}
			{typing.status === "finished" && (
				<div className="mt-6 space-y-2 text-center text-(--text)">
					<div className="font-bold text-5xl">WPM: {typing.wpm}</div>
					<div className="text-3xl">Accuracy: {typing.accuracy}%</div>
					<div className="mt-4 text-(--text-muted) text-base">Press Tab to restart</div>
				</div>
			)}
		</div>
	);
}
