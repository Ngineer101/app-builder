import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";
import { ensureMigrations } from "@/lib/migrate";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await ensureMigrations();
  const { GET } = toNextJsHandler(getAuth());
  return GET(req);
}

export async function POST(req: Request) {
  await ensureMigrations();
  const { POST } = toNextJsHandler(getAuth());
  return POST(req);
}
