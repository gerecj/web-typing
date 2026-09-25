import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ModeSwitcher } from "../../components/ModeSwitcher";
import { ThemePicker } from "../../components/ThemePicker";
import { normalizeLobbyCode } from "../../lib/race/lobby-code";
import { MAX_PLAYER_NAME_LENGTH } from "../../lib/race/protocol";
import { RACE_PLAYER_NAME_STORAGE_KEY } from "../../lib/race/session";

export const Route = createFileRoute("/race/")({
	component: RaceEntryPage,
});

function RaceEntryPage() {
	const navigate = useNavigate();
	const [name, setName] = useState(() => {
		if (typeof window === "undefined") return "";
		return window.sessionStorage.getItem(RACE_PLAYER_NAME_STORAGE_KEY) ?? "";
	});
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const hasValidName = name.trim().length > 0;

	function rememberName(): string | null {
		const normalized = name.trim();
		if (!normalized) {
			setError("Choose a guest name.");
			return null;
		}
		window.sessionStorage.setItem(RACE_PLAYER_NAME_STORAGE_KEY, normalized);
		return normalized;
	}

	async function createRace() {
		if (!hasValidName || !rememberName()) return;
		setCreating(true);
		setError(null);
		try {
			const response = await fetch("/api/lobbies", { method: "POST" });
			if (!response.ok) throw new Error("Lobby creation failed");
			const payload = (await response.json()) as { code?: unknown };
			if (typeof payload.code !== "string") throw new Error("Lobby code missing");
			await navigate({ to: "/race/$code", params: { code: payload.code } });
		} catch {
			setError("The lobby could not be created. Please try again.");
		} finally {
			setCreating(false);
		}
	}

	async function joinRace(event: FormEvent) {
		event.preventDefault();
		if (!rememberName()) return;
		const normalizedCode = normalizeLobbyCode(code);
		if (!normalizedCode) {
			setError("Enter a valid eight-character lobby code.");
			return;
		}
		await navigate({ to: "/race/$code", params: { code: normalizedCode } });
	}

	return (
		<main className="relative flex min-h-screen items-center justify-center bg-(--bg) px-4 font-mono">
			<div className="absolute top-4 left-4">
				<ModeSwitcher active="race" />
			</div>
			<div className="absolute top-4 right-4">
				<ThemePicker className="relative" />
			</div>

			<section className="w-full max-w-md space-y-6 rounded-xl border border-(--text-muted)/20 p-6">
				<header className="text-center">
					<p className="text-(--text-muted) text-sm">multiplayer</p>
					<h1 className="font-bold text-(--accent) text-3xl">typing race</h1>
					<p className="mt-2 text-(--text-muted) text-sm">
						Create a private lobby or join friends with a code.
					</p>
				</header>

				<label className="block space-y-2">
					<span className="text-(--text-muted) text-sm">guest name</span>
					<input
						value={name}
						maxLength={MAX_PLAYER_NAME_LENGTH}
						onChange={(event) => setName(event.currentTarget.value)}
						placeholder="Your name"
						className="w-full select-text rounded-md border border-(--text-muted)/30 bg-transparent px-3 py-2 text-(--text) outline-none focus:border-(--accent)"
					/>
				</label>

				<button
					type="button"
					disabled={creating || !hasValidName}
					onClick={createRace}
					className="w-full rounded-md bg-(--accent) px-4 py-2 text-(--bg) transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-(--text-muted) disabled:opacity-40"
				>
					{creating ? "creating…" : "create lobby"}
				</button>

				<div className="flex items-center gap-3 text-(--text-muted) text-xs">
					<span className="h-px flex-1 bg-(--text-muted)/20" />
					<span>or join</span>
					<span className="h-px flex-1 bg-(--text-muted)/20" />
				</div>

				<form onSubmit={joinRace} className="flex gap-2">
					<input
						value={code}
						maxLength={8}
						onChange={(event) => setCode(event.currentTarget.value.toUpperCase())}
						placeholder="LOBBY CODE"
						aria-label="Lobby code"
						className="min-w-0 flex-1 select-text rounded-md border border-(--text-muted)/30 bg-transparent px-3 py-2 text-(--text) uppercase tracking-wider outline-none focus:border-(--accent)"
					/>
					<button
						type="submit"
						className="rounded-md border border-(--accent) px-4 py-2 text-(--accent) transition hover:bg-(--accent)/10"
					>
						join
					</button>
				</form>

				{error && <p className="text-center text-(--text-error) text-sm">{error}</p>}
			</section>
		</main>
	);
}
