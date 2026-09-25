import type { RaceSettings } from "../lib/race/protocol";
import { CORPORA, QUOTE_GROUP_INDEX } from "../lib/typing-settings";
import { buildTypingText } from "../lib/typing-text-provider";

const FALLBACK_WORDS = ["the", "be", "to", "of", "and", "a", "in", "that", "have", "it"];

interface QuotePayload {
	groups?: Array<[number, number]>;
	quotes?: Array<{ text: string; length: number }>;
}

function randomFrom<T>(items: T[]): T | null {
	if (items.length === 0) return null;
	return items[Math.floor(Math.random() * items.length)] ?? null;
}

async function loadAssetJson<T>(env: Env, path: string): Promise<T> {
	const response = await env.ASSETS.fetch(new Request(`https://assets.local${path}`));
	if (!response.ok) throw new Error(`Unable to load race asset '${path}' (${response.status})`);
	return (await response.json()) as T;
}

export async function generateRacePassage(env: Env, settings: RaceSettings): Promise<string> {
	if (settings.preset === "quote") {
		const quotePath = settings.corpusId.startsWith("slovak")
			? "/quotes/slovak.json"
			: "/quotes/english.json";
		const payload = await loadAssetJson<QuotePayload>(env, quotePath);
		const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
		const range = payload.groups?.[QUOTE_GROUP_INDEX[settings.quoteLength]];
		const matching = range
			? quotes.filter((quote) => quote.length >= range[0] && quote.length <= range[1])
			: [];
		return randomFrom(matching)?.text ?? randomFrom(quotes)?.text ?? FALLBACK_WORDS.join(" ");
	}

	const corpus = CORPORA.find((candidate) => candidate.id === settings.corpusId) ?? CORPORA[0];
	const payload = await loadAssetJson<{ words?: unknown }>(env, corpus.path);
	const words =
		Array.isArray(payload.words) && payload.words.every((word) => typeof word === "string")
			? payload.words
			: FALLBACK_WORDS;
	return buildTypingText(words, settings.wordCount, {
		enrichText: settings.punctuationEnabled,
	});
}
