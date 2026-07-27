# web-typing

A minimalist typing game with two modes:

- **Solo** — the original local typing experience and the default route.
- **Race** — private, ephemeral 1–6 player lobbies with synchronized starts,
  server-verified results, and unanimous rematches.

The frontend uses React, TanStack Router, Vite, and Tailwind CSS. Multiplayer
rooms run in Cloudflare Workers using one SQLite-backed Durable Object per
lobby. No account or permanent result storage is required.

Both modes use the same free typing model: mistakes remain visible, character
and word deletion are supported, and WPM counts the correct characters in the
final typed text.

## Local development

Install dependencies:

```bash
pnpm install
```

Run the frontend and Cloudflare Worker in separate terminals:

```bash
pnpm dev
```

```bash
pnpm dev:worker
```

Open `http://localhost:3000`. Vite proxies `/api` HTTP and WebSocket traffic to
Wrangler on port 8787.

Wrangler runs Durable Objects, WebSockets, storage, and alarms locally through
Miniflare. After editing Durable Object alarm code during a session, restart
Wrangler before testing alarm behavior; hot reload can invalidate pending local
alarms.

Guests are intentionally sessionless. Leaving an active race records that player
as DNF; reopening the page creates a new guest, which can join once the room has
returned to its waiting phase.

## Verification

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm cf:dry-run
```

Regenerate Cloudflare binding types after changing `wrangler.jsonc`:

```bash
pnpm cf:types
```

## Deployment

Build and deploy the Worker and static assets:

```bash
pnpm build
pnpm wrangler deploy
```

Cloudflare creates the SQLite Durable Object migration declared in
`wrangler.jsonc` on the first deployment.

## Routes

- `/` — solo mode
- `/race` — create or join a lobby
- `/race/:code` — lobby, race, results, and rematch
