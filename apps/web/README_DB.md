# DB setup (app-builder)

This project uses SQLite + Drizzle.

## Env

- `DATABASE_PATH` (SQLite file path, e.g. `./app-builder.db`)
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
