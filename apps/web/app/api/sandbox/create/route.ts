import { NextResponse } from "next/server";
import { Sandbox } from "@vercel/sandbox";
import { kits, KitId } from "@app-builder/core";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const kitId = KitId.parse(body?.kitId);
    const kit = kits[kitId];

    const sandbox = await Sandbox.create({
      runtime: kit.runtime,
      ports: kit.ports,
      timeout: 30 * 60 * 1000,
    });

    // setup
    for (const step of kit.setup) {
      const cwd = step.cwd ? `/vercel/sandbox/${step.cwd}` : "/vercel/sandbox";
      const res = await sandbox.runCommand({ cmd: step.cmd, cwd, sudo: step.sudo, detached: false });
      if (res.exitCode !== 0) {
        const stdout = await res.stdout();
        const stderr = await res.stderr();
        throw new Error(`setup failed: ${step.cmd}\n${stdout}\n${stderr}`);
      }
    }

    // start dev server
    const devCwd = kit.dev.cwd ? `/vercel/sandbox/${kit.dev.cwd}` : "/vercel/sandbox";
    const devCmd = await sandbox.runCommand({ cmd: kit.dev.cmd, cwd: devCwd, detached: true });

    const previewUrls: Record<string, string> = {};
    for (const p of kit.ports) previewUrls[p] = sandbox.domain(p);

    return NextResponse.json({
      sandboxId: sandbox.sandboxId,
      kitId,
      devCmdId: devCmd.cmdId,
      previewUrls,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}
