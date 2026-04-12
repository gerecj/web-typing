import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { useTyping } from "./useTyping";

interface UseTypingViewportOptions {
	charWindow: number;
	cursorTransitionMs: number;
}

const WINDOW_REANCHOR_RATIO = 4;

function getReanchorStartIndex(currentIndex: number, charWindow: number): number {
	return Math.max(0, currentIndex - Math.floor(charWindow / WINDOW_REANCHOR_RATIO));
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

function updateLineStartIndices(
	lineStartIndices: number[],
	currentIndex: number,
	advance: boolean,
) {
	if (advance) {
		if (lineStartIndices[lineStartIndices.length - 1] !== currentIndex) {
			lineStartIndices.push(currentIndex);
		}
		return;
	}
	if (lineStartIndices.length > 1) {
		lineStartIndices.pop();
	}
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

	// Reset viewport tracking whenever a new source text is generated.
	useLayoutEffect(() => {
		setStartIndex(0);
		lineStartIndicesRef.current = [0];
		cursorTopRef.current = 0;
		prevIndexRef.current = 0;
	}, [typing.text]);

	// Keep cursor position and rendered text window in sync with current typing index.
	useLayoutEffect(() => {
		const currentIndex = typing.currentIndex;
		const previousIndex = prevIndexRef.current;
		const movedForward = currentIndex > previousIndex;
		const movedBackward = currentIndex < previousIndex;

		// Safety fallback: if cursor falls out of the visible window, re-anchor.
		if (currentIndex < startIndex || currentIndex >= startIndex + options.charWindow) {
			const nextStart = getReanchorStartIndex(currentIndex, options.charWindow);
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
			updateLineStartIndices(lineStartIndices, currentIndex, advance);

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
