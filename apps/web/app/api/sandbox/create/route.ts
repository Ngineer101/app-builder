import { NextResponse } from "next/server";
import { Sandbox } from "@vercel/sandbox";
import { kits, KitId } from "@app-builder/core";
import { getSandboxAuth } from "../_lib/vercelSandboxAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const kitId = KitId.parse(body?.kitId);
    const kit = kits[kitId];

    const auth = getSandboxAuth();

    const sandbox = await Sandbox.create({
      ...auth,
      runtime: kit.runtime,
      ports: kit.ports,
      timeout: 30 * 60 * 1000,
    });

    // setup
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
        const stdout = await res.stdout();
        const stderr = await res.stderr();
        throw new Error(`setup failed: ${step.cmd}\n${stdout}\n${stderr}`);
      }
    }

    // start dev server
    const devCwd = kit.dev.cwd
      ? `/vercel/sandbox/${kit.dev.cwd}`
      : "/vercel/sandbox";
    const devCmd = await sandbox.runCommand({
      cmd: "sh",
      args: ["-lc", kit.dev.cmd],
      cwd: devCwd,
      detached: true,
    });

    console.log(`Dev server started with cmdId ${devCmd.cmdId}`);

    const previewUrls: Record<string, string> = {};
    for (const p of kit.ports) previewUrls[p] = sandbox.domain(p);

    // QoL: wait until the dev server is reachable before returning
    const firstPreview = Object.values(previewUrls)[0];
    if (firstPreview) {
      const deadline = Date.now() + 30_000;
      let lastErr: any = null;
      while (Date.now() < deadline) {
        try {
          const r = await fetch(firstPreview, { cache: "no-store" });
          if (r.ok) break;
          lastErr = new Error(`HTTP ${r.status}`);
        } catch (e) {
          lastErr = e;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      // don't hard-fail on readiness; return anyway so user can retry
      if (lastErr) {
        console.warn("preview not ready yet", String(lastErr));
      }
    }

    return NextResponse.json({
      sandboxId: sandbox.sandboxId,
      kitId,
      devCmdId: devCmd.cmdId,
      previewUrls,
    });
  } catch (e: any) {
    console.error("Error creating sandbox:", e);
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 400 },
    );
  }
}
