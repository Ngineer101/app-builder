import { Sandbox } from "@vercel/sandbox";
import { kits, KitId } from "@app-builder/core";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sandboxes } from "@/lib/schema";

import { cleanupExpiredSandboxes } from "../_lib/cleanup";
import { requireSession } from "../_lib/session";
import { sseData, sseHeaders } from "../_lib/sse";
import { getSandboxAuth } from "../_lib/vercelSandboxAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const accept = req.headers.get("accept") || "";
  const wantsStream = accept.includes("text/event-stream");

  try {
    const session = await requireSession();
    await cleanupExpiredSandboxes(session.user.id);

    const body = (await req.json()) as any;
    const kitId = KitId.parse(body?.kitId);
    const kit = kits[kitId];
    const sandboxId = String(body?.sandboxId ?? "");
    const text = String(body?.text ?? "");

    if (!sandboxId) throw new Error("sandboxId required");
    if (!text.trim()) throw new Error("text required");

    // ensure sandbox belongs to user
    const row = await db()
      .select()
      .from(sandboxes)
      .where(eq(sandboxes.sandboxId, sandboxId))
      .limit(1);

    if (!row[0] || row[0].userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const auth = getSandboxAuth();

    const env: Record<string, string> = {};
    if (process.env.OPENAI_API_KEY) env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    const cwd = kit.appDir ? `/vercel/sandbox/${kit.appDir}` : "/vercel/sandbox";
    const executionPrompt = [
      "You are working inside an existing project workspace.",
      "First inspect the repository files to infer the stack/framework and implementation location.",
      "Do not ask the user clarifying questions unless absolutely blocked by missing secrets/credentials.",
      "Implement directly, then run the project's check command before finishing.",
      "User request:",
      text,
    ].join("\n\n");
    const cmdText = `opencode run ${JSON.stringify(executionPrompt)}`;

    const runOnce = async (sendLog?: (m: string) => void) => {
      // opencode
      const cmd = await Sandbox.get({ sandboxId, ...auth } as any);

      const op = await cmd.runCommand({
        cmd: "sh",
        args: ["-lc", cmdText],
        cwd,
        env,
        detached: false,
      });

      for await (const l of op.logs()) {
        sendLog?.(l.data);
      }
      const finished = await op.wait();
      if (finished.exitCode !== 0) throw new Error("opencode failed");

      // check
      const checkCwd = kit.check.cwd ? `/vercel/sandbox/${kit.check.cwd}` : "/vercel/sandbox";
      const check = await cmd.runCommand({
        cmd: "sh",
        args: ["-lc", kit.check.cmd],
        cwd: checkCwd,
        env,
        detached: false,
      });
      for await (const l of check.logs()) {
        sendLog?.(l.data);
      }
      const chk = await check.wait();
      if (chk.exitCode !== 0) throw new Error("check failed");
    };

    // touch activity
    await db().update(sandboxes).set({ lastActiveAt: new Date() }).where(eq(sandboxes.sandboxId, sandboxId));

    if (!wantsStream) {
      await runOnce();
      return NextResponse.json({ ok: true });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (obj: any) => controller.enqueue(enc.encode(sseData(obj)));
        try {
          send({ type: "step", stage: "prompt", message: "Running opencode…" });
          await runOnce((m) => send({ type: "log", message: m }));
          send({ type: "step", stage: "done", message: "OK" });
        } catch (e: any) {
          send({ type: "error", error: e?.message ?? String(e) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: sseHeaders() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: e?.message === "Unauthorized" ? 401 : 400 });
  }
}
