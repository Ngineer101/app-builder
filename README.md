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

## POC Spec

See: `POC_SPEC.md`
