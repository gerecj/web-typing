interface BuildTypingTextOptions {
	enrichText?: boolean;
}

function capitalizeFirstLetterToken(token: string): string {
	const match = token.match(/\p{L}/u);
	if (!match || match.index === undefined) return token;

	const index = match.index;
	return `${token.slice(0, index)}${token[index].toUpperCase()}${token.slice(index + 1)}`;
}

function decorateTokenWithSymbols(token: string): string {
	// Keep symbol density low so the text remains readable.
	const roll = Math.random();
	if (roll < 0.08 && token.length >= 4) {
		// Insert an apostrophe near the end: typing -> typi'ng
		const splitIndex = Math.max(1, token.length - 2);
		return `${token.slice(0, splitIndex)}'${token.slice(splitIndex)}`;
	}
	if (roll < 0.16 && token.length >= 4) {
		// Add a simple dash/minus inside the token.
		const splitIndex = Math.floor(token.length / 2);
		return `${token.slice(0, splitIndex)}-${token.slice(splitIndex)}`;
	}
	if (roll < 0.22) {
		// Occasionally wrap a single token in parentheses.
		return `(${token})`;
	}
	return token;
}

function enrichWords(words: string[]): string[] {
	if (words.length === 0) return words;

	const sentenceEndPunctuation = [".", "?", "!"] as const;
	const midPunctuation = [",", ";", ":"] as const;
	const enriched: string[] = [];
	let sentenceWordsUntilBreak = 6 + Math.floor(Math.random() * 6);
	let isSentenceStart = true;

	for (let i = 0; i < words.length; i++) {
		let token = words[i];
		if (isSentenceStart) {
			token = capitalizeFirstLetterToken(token);
		}

		token = decorateTokenWithSymbols(token);

		// Occasionally emphasize a single word with quotes.
		if (Math.random() < 0.08 && i < words.length - 1) {
			token = `"${token}"`;
		}

		const isLastWord = i === words.length - 1;
		const shouldEndSentence = isLastWord || sentenceWordsUntilBreak <= 1;

		if (shouldEndSentence) {
			const punctuation =
				sentenceEndPunctuation[Math.floor(Math.random() * sentenceEndPunctuation.length)];
			token += punctuation;
			sentenceWordsUntilBreak = 6 + Math.floor(Math.random() * 6);
			isSentenceStart = true;
		} else {
			if (Math.random() < 0.14) {
				const punctuation = midPunctuation[Math.floor(Math.random() * midPunctuation.length)];
				token += punctuation;
			}
			sentenceWordsUntilBreak -= 1;
			isSentenceStart = false;
		}

		enriched.push(token);
	}

	return enriched;
}

export function buildTypingText(
	words: string[],
	count: number,
	options?: BuildTypingTextOptions,
): string {
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

	const selected = shuffled.slice(0, count);
	const finalWords = options?.enrichText ? enrichWords(selected) : selected;

	return finalWords.join(" ");
}
