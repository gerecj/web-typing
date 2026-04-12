import { useLayoutEffect, useRef, useState } from "react";
import type { useTyping } from "../hooks/useTyping";

interface WordsProps {
	typing: ReturnType<typeof useTyping>;
}

const CHAR_WINDOW = 150;

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
			const nextStart = Math.max(0, currentIndex - Math.floor(CHAR_WINDOW / 3));
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
			let nextStart = 0;

			for (let i = lineStartIndices.length - 1; i >= 0; i--) {
				if (lineStartIndices[i] <= currentIndex) {
					if (advance || lineStartIndices[i - 1] === undefined) {
						nextStart = lineStartIndices[i];
					} else {
						nextStart = lineStartIndices[i - 1];
					}
					break;
				}
			}

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

		cursor.style.left = `${char.offsetLeft}px`;
		cursor.style.top = `${char.offsetTop}px`;
		cursor.style.height = `${char.offsetHeight}px`;
		cursorTopRef.current = char.offsetTop;
		prevIndexRef.current = currentIndex;
	}, [startIndex, typing.currentIndex, typing.status, typing.text]);

	return (
		<div className="w-full max-w-3xl space-y-8 px-4">
			{/* Progress */}
			<div className="text-center text-xl text-(--accent)">
				{typing.typedWords}/{typing.numWords}
			</div>

			{/* Words */}
			<div
				className="relative overflow-hidden text-2xl leading-relaxed whitespace-pre-wrap wrap-break-word"
				style={{ height: "calc(1.6em * 3)" }}
			>
				{renderChars.map(({ char, absoluteIndex }) => {
					let className = "text-(--text-muted)";
					if (absoluteIndex < typing.currentIndex) {
						className = typing.correctKeys[absoluteIndex] ? "text-(--text)" : "text-(--text-error)";
						if (typing.wordCorrectness[absoluteIndex] === false) {
							className +=
								" underline decoration-(--error-decoration) decoration-[1.5px] underline-offset-3";
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
					<span
						ref={cursorRef}
						className="absolute w-0.5 bg-(--accent) transition-all duration-100"
					/>
				)}
			</div>

			{/* Results */}
			{typing.status === "finished" && (
				<div className="space-y-2 text-center text-(--text)">
					<div className="text-4xl font-bold">WPM: {typing.wpm}</div>
					<div className="text-2xl">Accuracy: {typing.accuracy}%</div>
					<div className="mt-4 text-sm text-(--text-muted)">Press Tab to restart</div>
				</div>
			)}
		</div>
	);
}
