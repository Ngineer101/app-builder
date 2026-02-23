# app-builder (POC)

AI App Builder proof-of-concept that spins up real full-stack apps inside **Vercel Sandbox** using pre-defined **Stack Kits**.

Principle: **Sensible defaults first. Customization second.**

## Requirements

- Node.js >= 20
- `pnpm`
- `vercel` CLI authenticated and linked (for Vercel Sandbox OIDC token)

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull
```

## Getting started (local)

Install deps:

```bash
pnpm i
```

Run the web app:

```bash
pnpm dev
```

Run the CLI:

```bash
pnpm dev:cli -- --help
```

## Deploy to Vercel

### Environment variables

Required:
- `OPENAI_API_KEY` (forwarded into sandboxes so `opencode` can generate code)
- `DATABASE_URL` (Postgres connection string)
- `BETTER_AUTH_URL` (e.g. `http://localhost:3000` or your deployed URL)

Vercel Sandbox auth:
- On Vercel, OIDC *should* work automatically (recommended).
- Fallback (access token auth): set **all three**
  - `VERCEL_TEAM_ID`
  - `VERCEL_PROJECT_ID`
  - `VERCEL_TOKEN`

## POC Spec

See: `POC_SPEC.md`
