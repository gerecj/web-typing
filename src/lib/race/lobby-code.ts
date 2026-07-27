export const LOBBY_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const LOBBY_CODE_LENGTH = 8;

export function createLobbyCode(): string {
	const random = new Uint8Array(LOBBY_CODE_LENGTH);
	crypto.getRandomValues(random);
	return Array.from(
		random,
		(value) => LOBBY_CODE_ALPHABET[value % LOBBY_CODE_ALPHABET.length],
	).join("");
}

export function normalizeLobbyCode(value: string): string | null {
	const normalized = value.trim().toUpperCase();
	if (normalized.length !== LOBBY_CODE_LENGTH) return null;
	for (const character of normalized) {
		if (!LOBBY_CODE_ALPHABET.includes(character)) return null;
	}
	return normalized;
}
