const RECENT_WPM_KEY = "typing-recent-wpm";
const RECENT_RESULTS = 10;

function readRecentWpm(): number[] {
	try {
		const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_WPM_KEY) ?? "[]");
		return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "number") : [];
	} catch {
		return [];
	}
}

/** Remembers a finished result, so race bots can be matched to the player's speed. */
export function recordWpm(wpm: number) {
	if (!(wpm > 0)) return;
	const recent = [...readRecentWpm(), wpm].slice(-RECENT_RESULTS);
	window.localStorage.setItem(RECENT_WPM_KEY, JSON.stringify(recent));
}

/** The player's average over their recent results, or undefined before their first. */
export function averageWpm(): number | undefined {
	const recent = readRecentWpm();
	if (recent.length === 0) return undefined;
	return recent.reduce((sum, wpm) => sum + wpm, 0) / recent.length;
}
