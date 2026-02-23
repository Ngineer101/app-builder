import { and, eq, isNull, lt } from "drizzle-orm";
import { Sandbox } from "@vercel/sandbox";

import { db } from "@/lib/db";
import { sandboxes } from "@/lib/schema";

import { getSandboxAuth } from "./vercelSandboxAuth";

const INACTIVITY_MS = 15 * 60 * 1000;

export async function cleanupExpiredSandboxes(userId: string) {
  const cutoff = new Date(Date.now() - INACTIVITY_MS);

  const expired = await db()
    .select()
    .from(sandboxes)
    .where(and(eq(sandboxes.userId, userId), isNull(sandboxes.stoppedAt), lt(sandboxes.lastActiveAt, cutoff)))
    .limit(25);

  if (expired.length === 0) return;

  const auth = getSandboxAuth();

  for (const row of expired) {
    try {
      const sb = await Sandbox.get({ sandboxId: row.sandboxId, ...auth } as any);
      await sb.stop();
    } catch {
      // ignore (may already be stopped)
    }

    await db()
      .update(sandboxes)
      .set({ stoppedAt: new Date() })
      .where(and(eq(sandboxes.userId, userId), eq(sandboxes.sandboxId, row.sandboxId)));
  }
}
