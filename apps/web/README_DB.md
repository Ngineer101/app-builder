# DB setup (app-builder)

This project uses Postgres + Drizzle.

## Env

- `DATABASE_URL` (Postgres connection string)
- `BETTER_AUTH_URL` (e.g. `http://localhost:3000` or your deployed URL)

## Better Auth schema

Better Auth manages its own tables. Generate them with:

```bash
cd apps/web
pnpm dlx @better-auth/cli@latest generate
```

Then generate a migration:

```bash
cd apps/web
pnpm dlx drizzle-kit generate
pnpm dlx drizzle-kit migrate
```

(For the POC we keep migrations in `apps/web/drizzle/`.)
