import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { useTyping } from "./useTyping";

interface UseTypingViewportOptions {
	charWindow: number;
	cursorTransitionMs: number;
}

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

export function useTypingViewport(
	typing: ReturnType<typeof useTyping>,
	options: UseTypingViewportOptions,
) {
	const currentCharRef = useRef<HTMLSpanElement>(null);
	const cursorRef = useRef<HTMLSpanElement>(null);
	const lineStartIndicesRef = useRef<number[]>([0]);
	const cursorTopRef = useRef(0);
	const prevIndexRef = useRef(0);
	const [startIndex, setStartIndex] = useState(0);

	const renderChars = typing.text
		.slice(startIndex, startIndex + options.charWindow)
		.split("")
		.map((char, localIndex) => ({
			char,
			absoluteIndex: startIndex + localIndex,
		}));

	const assignCurrentCharRef = useCallback(
		(absoluteIndex: number, node: HTMLSpanElement | null) => {
			if (absoluteIndex === typing.currentIndex) {
				currentCharRef.current = node;
			} else if (currentCharRef.current === node) {
				currentCharRef.current = null;
			}
		},
		[typing.currentIndex],
	);

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
		if (currentIndex < startIndex || currentIndex >= startIndex + options.charWindow) {
			const windowReanchorRatio = 4;
			const nextStart = Math.max(
				0,
				currentIndex - Math.floor(options.charWindow / windowReanchorRatio),
			);
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
			movedForward || movedBackward ? `transform ${options.cursorTransitionMs}ms linear` : "none";
		cursor.style.transform = `translate(${char.offsetLeft}px, ${char.offsetTop}px)`;
		cursor.style.height = `${char.offsetHeight}px`;
		cursorTopRef.current = char.offsetTop;
		prevIndexRef.current = currentIndex;
	}, [
		options.charWindow,
		options.cursorTransitionMs,
		startIndex,
		typing.currentIndex,
		typing.status,
		typing.text,
	]);

	return {
		renderChars,
		cursorRef,
		assignCurrentCharRef,
	};
}
