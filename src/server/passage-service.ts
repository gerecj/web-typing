import {
	FALLBACK_WORDS,
	getCorpusPath,
	getQuotePath,
	parseCorpusWords,
	parseQuotes,
	pickQuote,
} from "../lib/passages";
import type { RaceSettings } from "../lib/race/protocol";
import { buildTypingText } from "../lib/typing-text-provider";

async function loadAssetJson(env: Env, path: string): Promise<unknown> {
	const response = await env.ASSETS.fetch(new Request(`https://assets.local${path}`));
	if (!response.ok) throw new Error(`Unable to load race asset '${path}' (${response.status})`);
	return response.json();
}

export async function generateRacePassage(env: Env, settings: RaceSettings): Promise<string> {
	if (settings.preset === "quote") {
		const payload = await loadAssetJson(env, getQuotePath(settings.corpusId));
		return pickQuote(parseQuotes(payload), settings.quoteLength);
	}

	const payload = await loadAssetJson(env, getCorpusPath(settings.corpusId));
	const words = parseCorpusWords(payload) ?? FALLBACK_WORDS;
	return buildTypingText(words, settings.wordCount, {
		enrichText: settings.punctuationEnabled,
	});
}
