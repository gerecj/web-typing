const USE_STATIC_DEBUG_TEXT = false;

const STATIC_DEBUG_WORDS = [
	"0",
	"01",
	"012",
	"0123",
	"01234",
	"012345",
	"0123456",
	"012345671", // until wrapping starts
];

function buildStaticDebugText(count: number): string {
	if (count <= 0) return "";

	const words: string[] = [];
	for (let i = 0; i < count; i++) {
		words.push(STATIC_DEBUG_WORDS[i % STATIC_DEBUG_WORDS.length]);
	}

	return words.join(" ");
}

export function buildTypingText(words: string[], count: number): string {
	if (USE_STATIC_DEBUG_TEXT) {
		return buildStaticDebugText(count);
	}

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
