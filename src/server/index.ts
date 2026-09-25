import { createLobbyCode, normalizeLobbyCode } from "../lib/race/lobby-code";
import { RaceRoom } from "./race-room";

const MAX_CREATE_ATTEMPTS = 5;

function roomStub(env: Env, code: string): DurableObjectStub<RaceRoom> {
	return env.RACE_ROOMS.get(env.RACE_ROOMS.idFromName(code));
}

async function createLobby(env: Env): Promise<Response> {
	for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
		const code = createLobbyCode();
		const created = await roomStub(env, code).initialize(code);
		if (created) return Response.json({ code }, { status: 201 });
	}
	return new Response("Unable to allocate a unique lobby code", { status: 503 });
}

async function routeApi(request: Request, env: Env): Promise<Response | null> {
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
} satisfies ExportedHandler<Env>;
