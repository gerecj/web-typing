import { createLobbyCode, normalizeLobbyCode } from "../lib/race/lobby-code";
import type { WorkerEnv } from "./env";
import { RaceRoom } from "./race-room";

const MAX_CREATE_ATTEMPTS = 5;

function roomStub(env: WorkerEnv, code: string): DurableObjectStub {
	return env.RACE_ROOMS.get(env.RACE_ROOMS.idFromName(code));
}

async function createLobby(env: WorkerEnv): Promise<Response> {
	for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
		const code = createLobbyCode();
		const response = await roomStub(env, code).fetch("https://race-room/initialize", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ code }),
		});
		if (response.status === 409) continue;
		if (!response.ok) return new Response("Unable to create lobby", { status: 502 });
		return Response.json({ code }, { status: 201 });
	}
	return new Response("Unable to allocate a unique lobby code", { status: 503 });
}

async function routeApi(request: Request, env: WorkerEnv): Promise<Response | null> {
	const url = new URL(request.url);

	if (request.method === "POST" && url.pathname === "/api/lobbies") {
		return createLobby(env);
	}

	const match = url.pathname.match(/^\/api\/lobbies\/([^/]+)\/websocket$/);
	if (request.method === "GET" && match) {
		const code = normalizeLobbyCode(match[1] ?? "");
		if (!code) return new Response("Invalid lobby code", { status: 400 });
		return roomStub(env, code).fetch(request);
	}

	if (url.pathname.startsWith("/api/")) {
		return new Response("Not found", { status: 404 });
	}
	return null;
}

export { RaceRoom };

export default {
	async fetch(request, env): Promise<Response> {
		const apiResponse = await routeApi(request, env);
		return apiResponse ?? env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<WorkerEnv>;
