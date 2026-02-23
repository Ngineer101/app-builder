import { Sandbox } from "@vercel/sandbox";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sandboxes } from "@/lib/schema";

import { cleanupExpiredSandboxes } from "../_lib/cleanup";
import { requireSession } from "../_lib/session";
import { getSandboxAuth } from "../_lib/vercelSandboxAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    await cleanupExpiredSandboxes(session.user.id);

    const body = (await req.json()) as any;
    const sandboxId = String(body?.sandboxId ?? "");
    if (!sandboxId) throw new Error("sandboxId required");

    const row = await db().select().from(sandboxes).where(eq(sandboxes.sandboxId, sandboxId)).limit(1);
    if (!row[0] || row[0].userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const auth = getSandboxAuth();

    try {
      const sandbox = await Sandbox.get({ sandboxId, ...auth } as any);
      await sandbox.stop();
    } catch {
      // ignore
    }

    await db().update(sandboxes).set({ stoppedAt: new Date() }).where(eq(sandboxes.sandboxId, sandboxId));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: e?.message === "Unauthorized" ? 401 : 400 });
  }
}
