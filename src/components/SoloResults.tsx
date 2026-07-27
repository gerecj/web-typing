import type { useTyping } from "../hooks/useTyping";

interface SoloResultsProps {
	typing: ReturnType<typeof useTyping>;
}

export function SoloResults({ typing }: SoloResultsProps) {
	if (typing.status !== "finished") return null;

	return (
		<div className="space-y-2 text-center text-(--text)">
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
	);
}
