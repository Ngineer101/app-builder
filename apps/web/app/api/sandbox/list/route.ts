import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sandboxes } from "@/lib/schema";

import { cleanupExpiredSandboxes } from "../_lib/cleanup";
import { requireSession } from "../_lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireSession();
    await cleanupExpiredSandboxes(session.user.id);

    const rows = await db()
      .select({
        id: sandboxes.id,
        kitId: sandboxes.kitId,
        sandboxId: sandboxes.sandboxId,
        previewUrl: sandboxes.previewUrl,
        createdAt: sandboxes.createdAt,
        lastActiveAt: sandboxes.lastActiveAt,
        stoppedAt: sandboxes.stoppedAt,
      })
      .from(sandboxes)
      .where(eq(sandboxes.userId, session.user.id))
      .orderBy(desc(sandboxes.createdAt))
      .limit(50);

    return NextResponse.json({
      sandboxes: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        lastActiveAt: r.lastActiveAt.toISOString(),
        stoppedAt: r.stoppedAt ? r.stoppedAt.toISOString() : null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: e?.message === "Unauthorized" ? 401 : 400 });
  }
}
