import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { ensureMigrations } from "@/lib/migrate";

export async function requireSession() {
  await ensureMigrations();

  const session = await getAuth().api.getSession({
    headers: await headers(),
  });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
