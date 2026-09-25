import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";

interface TypingStageProps {
	children: ReactNode;
	topContent?: ReactNode;
	bottomContent?: ReactNode;
}

interface StageFit {
	verticalOffset: number;
	topCompression: number;
}

const TOP_SAFE_EDGE_PX = 56;
const BOTTOM_SAFE_EDGE_PX = 16;
const DEFAULT_FIT: StageFit = { verticalOffset: 0, topCompression: 0 };

export function TypingStage({ children, topContent, bottomContent }: TypingStageProps) {
	const stageRef = useRef<HTMLDivElement>(null);
	const topContentRef = useRef<HTMLDivElement>(null);
	const bottomContentRef = useRef<HTMLDivElement>(null);
	const [fit, setFit] = useState<StageFit>(DEFAULT_FIT);
	const hasTopContent = topContent !== undefined && topContent !== null;
	const hasBottomContent = bottomContent !== undefined && bottomContent !== null;

	useLayoutEffect(() => {
		if (!hasTopContent && !hasBottomContent) {
			setFit(DEFAULT_FIT);
			return;
		}

		const stageElement = stageRef.current;
		const topElement = topContentRef.current;
		const bottomElement = bottomContentRef.current;
		if (!stageElement || (hasTopContent && !topElement) || (hasBottomContent && !bottomElement)) {
			return;
		}

		const fitToViewport = () => {
			const stageRect = stageElement.getBoundingClientRect();
			const topRect = topElement?.getBoundingClientRect();
			const bottomRect = bottomElement?.getBoundingClientRect();

			setFit((current) => {
				const uncompressedTop = topRect
					? topRect.top - current.verticalOffset - current.topCompression
					: Number.POSITIVE_INFINITY;
				const unshiftedBottom = (bottomRect?.bottom ?? stageRect.bottom) - current.verticalOffset;
				const minimumOffset = TOP_SAFE_EDGE_PX - uncompressedTop;
				const maximumOffset = window.innerHeight - BOTTOM_SAFE_EDGE_PX - unshiftedBottom;

				if (minimumOffset <= maximumOffset) {
					return {
						verticalOffset: Math.min(maximumOffset, Math.max(minimumOffset, 0)),
						topCompression: 0,
					};
				}

				return {
					verticalOffset: maximumOffset,
					topCompression: minimumOffset - maximumOffset,
				};
			});
		};

		fitToViewport();
		const observer = new ResizeObserver(fitToViewport);
		observer.observe(stageElement);
		if (topElement) observer.observe(topElement);
		if (bottomElement) observer.observe(bottomElement);
		window.addEventListener("resize", fitToViewport);

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", fitToViewport);
		};
	}, [hasBottomContent, hasTopContent]);

	const stageStyle = {
		transform: `translateY(${fit.verticalOffset}px)`,
		"--typing-top-compression": `${fit.topCompression}px`,
	} as CSSProperties;

	return (
		<div className="w-full max-w-4xl px-4">
			<div ref={stageRef} className="relative" style={stageStyle}>
				{hasTopContent && (
					<div ref={topContentRef} className="absolute inset-x-0 bottom-[calc(100%+5rem)]">
						{topContent}
					</div>
				)}
				{children}
				{hasBottomContent && (
					<div ref={bottomContentRef} className="absolute inset-x-0 top-full pt-6">
						{bottomContent}
					</div>
				)}
			</div>
		</div>
	);
}
