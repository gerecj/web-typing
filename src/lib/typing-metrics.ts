export function calculateWPM(startTime: number, endTime: number, correctKeys: boolean[]): number {
	const minutes = (endTime - startTime) / 60000;
	if (minutes <= 0) return 0;
	const correctChars = correctKeys.filter(Boolean).length;
	return Math.round(correctChars / 5 / minutes);
}

export function calculateAccuracy(totalInputs: number, correctInputs: number): number {
	if (totalInputs === 0) return 0;
	return Math.round((correctInputs / totalInputs) * 100);
}

export function computeWordCorrectness(text: string, correctKeys: boolean[]): (boolean | null)[] {
	const result: (boolean | null)[] = new Array(text.length).fill(null);
	let wordStart = 0;

	for (let i = 0; i <= text.length; i++) {
		if (i === text.length || text[i] === " ") {
			const isLastWord = i === text.length;
			const wordFinished = isLastWord ? correctKeys.length >= i : correctKeys.length > i;

			if (wordFinished) {
				const charsCorrect = correctKeys.slice(wordStart, i).every(Boolean);
				const separatorCorrect = isLastWord ? true : correctKeys[i] === true;
				const wordCorrect = charsCorrect && separatorCorrect;
				for (let j = wordStart; j < i; j++) {
					result[j] = wordCorrect;
				}
				// Space gets its own correctness (was it typed correctly?)
				if (!isLastWord && i < correctKeys.length) {
					result[i] = correctKeys[i];
				}
			}
			wordStart = i + 1;
		}
	}

	return result;
}

export function countTypedWords(text: string, currentIndex: number): number {
	if (currentIndex === 0) return 0;
	const typed = text.slice(0, currentIndex);
	const spaces = (typed.match(/ /g) || []).length;
	return currentIndex >= text.length ? spaces + 1 : spaces;
}

export function countCorrectWords(text: string, wordCorrectness: (boolean | null)[]): number {
	let correctWords = 0;
	let wordStart = 0;

	for (let i = 0; i <= text.length; i++) {
		if (i === text.length || text[i] === " ") {
			const wordStatuses = wordCorrectness.slice(wordStart, i);
			const finished = wordStatuses.length > 0 && wordStatuses.every((status) => status !== null);
			const allCorrect = finished && wordStatuses.every((status) => status === true);

			if (allCorrect) {
				correctWords++;
			}

			wordStart = i + 1;
		}
	}

	return correctWords;
}
