import { useEffect, useState } from "react";

interface CountdownProps {
	startsAt: number;
	clockOffsetMs: number;
}

export function Countdown({ startsAt, clockOffsetMs }: CountdownProps) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const interval = window.setInterval(() => setNow(Date.now()), 50);
		return () => window.clearInterval(interval);
	}, []);

	const remainingMs = startsAt - (now + clockOffsetMs);
	if (remainingMs <= 0) return null;

	return (
		<div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-(--bg)/45">
			<div className="font-bold text-(--accent) text-8xl">
				{Math.max(1, Math.ceil(remainingMs / 1_000))}
			</div>
		</div>
	);
}
