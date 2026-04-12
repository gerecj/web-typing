import { useLayoutEffect, useRef, useState } from "react";
import type { useTyping } from "../hooks/useTyping";

interface WordsProps {
	typing: ReturnType<typeof useTyping>;
}

const CHAR_WINDOW = 200;
const CURSOR_TRANSITION_MS = 100;

function findNextStartIndex(
	lineStartIndices: number[],
	currentIndex: number,
	advance: boolean,
): number {
	for (let i = lineStartIndices.length - 1; i >= 0; i--) {
		if (lineStartIndices[i] <= currentIndex) {
			if (advance || lineStartIndices[i - 1] === undefined) {
				return lineStartIndices[i];
			}
			return lineStartIndices[i - 1];
		}
	}

	return 0;
}

export function Words({ typing }: WordsProps) {
	const currentCharRef = useRef<HTMLSpanElement>(null);
	const cursorRef = useRef<HTMLSpanElement>(null);
	const lineStartIndicesRef = useRef<number[]>([0]);
	const cursorTopRef = useRef(0);
	const prevIndexRef = useRef(0);
	const [startIndex, setStartIndex] = useState(0);

	const renderChars = typing.text
		.slice(startIndex, startIndex + CHAR_WINDOW)
		.split("")
		.map((char, localIndex) => ({
			char,
			absoluteIndex: startIndex + localIndex,
		}));

	useLayoutEffect(() => {
		setStartIndex(0);
		lineStartIndicesRef.current = [0];
		cursorTopRef.current = 0;
		prevIndexRef.current = 0;
	}, [typing.text]);

	useLayoutEffect(() => {
		const currentIndex = typing.currentIndex;
		const previousIndex = prevIndexRef.current;
		const movedForward = currentIndex > previousIndex;
		const movedBackward = currentIndex < previousIndex;

		// Safety fallback: if cursor falls out of the visible window, re-anchor.
		if (currentIndex < startIndex || currentIndex >= startIndex + CHAR_WINDOW) {
			const WINDOW_REANCHOR_RATIO = 4;
			const nextStart = Math.max(0, currentIndex - Math.floor(CHAR_WINDOW / WINDOW_REANCHOR_RATIO));
			setStartIndex(nextStart);
			lineStartIndicesRef.current = [nextStart];
			cursorTopRef.current = 0;
			prevIndexRef.current = currentIndex;
			return;
		}

		const char = currentCharRef.current;
		const cursor = cursorRef.current;
		if (!char || !cursor) {
			prevIndexRef.current = currentIndex;
			return;
		}

		if (char.offsetTop !== cursorTopRef.current && (movedForward || movedBackward)) {
			const advance = movedForward;
			const lineStartIndices = lineStartIndicesRef.current;
			const nextStart = findNextStartIndex(lineStartIndices, currentIndex, advance);

			if (advance) {
				if (lineStartIndices[lineStartIndices.length - 1] !== currentIndex) {
					lineStartIndices.push(currentIndex);
				}
			} else if (lineStartIndices.length > 1) {
				lineStartIndices.pop();
			}

			if (nextStart !== startIndex) {
				setStartIndex(nextStart);
			}
		}

		cursor.style.transition =
			movedForward || movedBackward ? `transform ${CURSOR_TRANSITION_MS}ms linear` : "none";
		cursor.style.transform = `translate(${char.offsetLeft}px, ${char.offsetTop}px)`;
		cursor.style.height = `${char.offsetHeight}px`;
		cursorTopRef.current = char.offsetTop;
		prevIndexRef.current = currentIndex;
	}, [startIndex, typing.currentIndex, typing.status, typing.text]);

	return (
		<div className="w-full max-w-3xl px-4">
			<div className="relative">
				{/* Progress */}
				<div className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2 text-(--accent) text-xl">
					{typing.typedWords}/{typing.numWords}
				</div>

				{/* Words */}
				<div
					className="wrap-break-word relative overflow-hidden whitespace-pre-wrap text-2xl leading-relaxed"
					style={{ height: "calc(1.6em * 3)" }}
				>
					{renderChars.map(({ char, absoluteIndex }) => {
						let className = "text-(--text-muted)";
						if (absoluteIndex < typing.currentIndex) {
							className = typing.correctKeys[absoluteIndex]
								? "text-(--text)"
								: "text-(--text-error)";
							if (typing.wordCorrectness[absoluteIndex] === false) {
								className +=
									" underline decoration-(--error-decoration) decoration-[1.5px] underline-offset-2";
							}
						}
						return (
							<span
								key={`${absoluteIndex}-${char}`}
								ref={absoluteIndex === typing.currentIndex ? currentCharRef : undefined}
								className={className}
							>
								{char}
							</span>
						);
					})}

					{/* Cursor */}
					{typing.status !== "finished" && (
						<span ref={cursorRef} className="absolute top-0 left-0 w-0.5 bg-(--accent)" />
					)}
				</div>
				<div className="pointer-events-none absolute top-full left-0 mt-4 text-(--text-muted) text-xs">
					debug correct words: {typing.correctWords}
				</div>
			</div>

			{/* Results */}
			{typing.status === "finished" && (
				<div className="mt-6 space-y-2 text-center text-(--text)">
					<div className="font-bold text-4xl">WPM: {typing.wpm}</div>
					<div className="text-2xl">Accuracy: {typing.accuracy}%</div>
					<div className="mt-4 text-(--text-muted) text-sm">Press Tab to restart</div>
				</div>
			)}
		</div>
	);
}
