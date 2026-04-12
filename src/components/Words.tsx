import { useLayoutEffect, useRef } from "react";
import type { useTyping } from "../hooks/useTyping";

interface WordsProps {
	typing: ReturnType<typeof useTyping>;
}

export function Words({ typing }: WordsProps) {
	const currentCharRef = useRef<HTMLSpanElement>(null);
	const cursorRef = useRef<HTMLSpanElement>(null);

	useLayoutEffect(() => {
		const char = currentCharRef.current;
		const cursor = cursorRef.current;
		if (!char || !cursor) return;

		const container = char.parentElement;
		if (container) {
			const canScroll = container.scrollHeight - container.clientHeight;
			const targetScroll = char.offsetTop - container.clientHeight / 2 + char.offsetHeight / 2;
			if (targetScroll <= canScroll) {
				char.scrollIntoView({ block: "center" });
			}
		}

		cursor.style.left = `${char.offsetLeft}px`;
		cursor.style.top = `${char.offsetTop}px`;
		cursor.style.height = `${char.offsetHeight}px`;
	}, [typing.currentIndex, typing.text, typing.status]);

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
				{typing.text.split("").map((char, i) => {
					let className = "text-(--text-muted)";
					if (i < typing.currentIndex) {
						className = typing.correctKeys[i] ? "text-(--text)" : "text-(--text-error)";
						if (typing.wordCorrectness[i] === false) {
							className +=
								" underline decoration-(--error-decoration) decoration-[1.5px] underline-offset-3";
						}
					}
					return (
						<span
							key={`${i}-${char}`}
							ref={i === typing.currentIndex ? currentCharRef : undefined}
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
