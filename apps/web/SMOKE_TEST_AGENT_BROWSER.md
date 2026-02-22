# Smoke test (agent-browser) — App Builder POC

This file documents reproducible smoke test steps for the web app.

## Prereqs

```bash
cd /home/ngineer101/Code/app-builder
pnpm i
pnpm dev
```

App should be on: http://localhost:3000

## Agent-browser steps (manual replay)

1) Open the app: `http://localhost:3000`
2) Verify the page loads and you see:
   - Title: "App Builder"
   - A "Create sandbox" button
3) Select kit `vite-react` (faster to create than nextjs)
4) Click **Create sandbox**
5) Confirm the UI shows:
   - `sandboxId: ...`
   - `preview: https://...`
6) Wait for preview iframe to load (readiness wait is handled server-side)
7) Enter prompt: "Change the homepage to say hello"
8) Click **Run**
9) Confirm logs update with stdout/stderr blocks
10) Click **Stop**

## API-only smoke test (curl)

```bash
# create
curl -s -X POST http://localhost:3000/api/sandbox/create \
  -H 'content-type: application/json' \
  -d '{"kitId":"vite-react"}' | jq

# prompt (replace sandboxId)
curl -s -X POST http://localhost:3000/api/sandbox/prompt \
  -H 'content-type: application/json' \
  -d '{"kitId":"vite-react","sandboxId":"<ID>","text":"Change homepage title"}' | jq

# stop
curl -s -X POST http://localhost:3000/api/sandbox/stop \
  -H 'content-type: application/json' \
  -d '{"sandboxId":"<ID>"}' | jq
```

## Notes

- In production on Vercel, `@vercel/sandbox` should authenticate via OIDC automatically.
- If OIDC is not available, set `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN`.
- `OPENAI_API_KEY` is required for prompts (opencode) to work.
