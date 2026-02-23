import { Sandbox } from "@vercel/sandbox";
import { kits, KitId } from "@app-builder/core";
import { NextResponse } from "next/server";

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

    const auth = getSandboxAuth();

    if (!wantsStream) {
      // JSON fallback
      const sandbox = await Sandbox.create({
        ...auth,
        runtime: kit.runtime,
        ports: kit.ports,
        timeout: 30 * 60 * 1000,
      } as any);

      for (const step of kit.setup) {
        const cwd = step.cwd ? `/vercel/sandbox/${step.cwd}` : "/vercel/sandbox";
        const res = await sandbox.runCommand({
          cmd: "sh",
          args: ["-lc", step.cmd],
          cwd,
          sudo: step.sudo,
          detached: false,
        });
        if (res.exitCode !== 0) {
          throw new Error(`setup failed: ${step.cmd}\n${await res.stdout()}\n${await res.stderr()}`);
        }
      }

      const devCwd = kit.dev.cwd ? `/vercel/sandbox/${kit.dev.cwd}` : "/vercel/sandbox";
      const devCmd = await sandbox.runCommand({
        cmd: "sh",
        args: ["-lc", kit.dev.cmd],
        cwd: devCwd,
        detached: true,
      });

      const previewUrls: Record<string, string> = {};
      for (const p of kit.ports) previewUrls[p] = sandbox.domain(p);

      await db().insert(sandboxes).values({
        userId: session.user.id,
        kitId,
        sandboxId: sandbox.sandboxId,
        previewUrl: Object.values(previewUrls)[0] ?? null,
      });

      return NextResponse.json({
        sandboxId: sandbox.sandboxId,
        kitId,
        devCmdId: devCmd.cmdId,
        previewUrls,
      });
    }

    // Streamed version
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (obj: any) => controller.enqueue(enc.encode(sseData(obj)));

        try {
          send({ type: "step", stage: "create", message: "Creating sandbox…" });

          const sandbox = await Sandbox.create({
            ...auth,
            runtime: kit.runtime,
            ports: kit.ports,
            timeout: 30 * 60 * 1000,
          } as any);

          send({ type: "step", stage: "create", message: `sandboxId: ${sandbox.sandboxId}` });

          for (const step of kit.setup) {
            const cwd = step.cwd ? `/vercel/sandbox/${step.cwd}` : "/vercel/sandbox";
            send({ type: "step", stage: "setup", message: step.cmd });

            const cmd = await sandbox.runCommand({
              cmd: "sh",
              args: ["-lc", step.cmd],
              cwd,
              sudo: step.sudo,
              detached: true,
            });

            for await (const line of cmd.logs()) {
              send({ type: "log", message: line.data });
            }

            const finished = await cmd.wait();
            if (finished.exitCode !== 0) {
              throw new Error(`setup failed: ${step.cmd}`);
            }
          }

          send({ type: "step", stage: "dev", message: "Starting dev server…" });
          const devCwd = kit.dev.cwd ? `/vercel/sandbox/${kit.dev.cwd}` : "/vercel/sandbox";
          const devCmd = await sandbox.runCommand({
            cmd: "sh",
            args: ["-lc", kit.dev.cmd],
            cwd: devCwd,
            detached: true,
          });

          const previewUrls: Record<string, string> = {};
          for (const p of kit.ports) previewUrls[p] = sandbox.domain(p);

          // wait for first preview
          const firstPreview = Object.values(previewUrls)[0];
          if (firstPreview) {
            send({ type: "step", stage: "dev", message: "Waiting for preview…" });
            const deadline = Date.now() + 30_000;
            while (Date.now() < deadline) {
              try {
                const r = await fetch(firstPreview, { cache: "no-store" });
                if (r.ok) break;
              } catch {
                // ignore
              }
              await new Promise((r) => setTimeout(r, 1000));
            }
          }

          await db().insert(sandboxes).values({
            userId: session.user.id,
            kitId,
            sandboxId: sandbox.sandboxId,
            previewUrl: Object.values(previewUrls)[0] ?? null,
          });

          send({
            type: "result",
            result: {
              sandboxId: sandbox.sandboxId,
              kitId,
              devCmdId: devCmd.cmdId,
              previewUrls,
            },
          });
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
