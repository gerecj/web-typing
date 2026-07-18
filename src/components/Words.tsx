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
				" underline decoration-(--error-decoration) decoration-[1.5px] underline-offset-3";
		}
	}
	return className;
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
		<div className="w-full max-w-4xl px-4">
			<div className="relative">
				{/* Progress */}
				<div className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2 text-(--accent) text-2xl">
					{typing.mode === "time"
						? `${Math.max(0, Math.ceil(typing.timeLeftMs / 1000))}`
						: `${typing.typedWords}/${typing.totalWords}`}
				</div>

				{/* Words */}
				<div className="wrap-break-word relative h-[calc(3lh)] overflow-hidden whitespace-pre-wrap text-3xl leading-normal">
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
					<div className="font-bold text-4xl">
						<span>WPM: </span>
						<span className="text-(--accent)">{typing.wpm}</span>
					</div>
					<div className="text-3xl">
						<span>Accuracy: </span>
						<span className="text-(--accent)">{typing.accuracy}%</span>
					</div>
					<div className="mt-4 text-(--text-muted) text-base">
						<span>Press Tab to </span>
						<button
							type="button"
							onClick={typing.reset}
							className="rounded-sm underline underline-offset-4 transition hover:text-(--text) focus-visible:outline-(--accent) focus-visible:outline-2 focus-visible:outline-offset-4"
						>
							restart
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
