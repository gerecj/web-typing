export function buildTypingText(words: string[], count: number): string {
	if (words.length === 0) return "";

	let pool = words;
	while (pool.length < count) {
		pool = pool.concat(words);
	}

	// Fisher-Yates shuffle on a copy
	const shuffled = pool.slice();
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	return shuffled.slice(0, count).join(" ");
}
