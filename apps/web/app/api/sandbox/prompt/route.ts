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
    const sandboxId = String(body.sandboxId);
    const text = String(body.text ?? "");

    if (!sandboxId) throw new Error("sandboxId required");
    if (!text.trim()) throw new Error("text required");

    const auth = getSandboxAuth();
    const sandbox = await Sandbox.get({ sandboxId, ...auth });

    const cwd = kit.appDir ? `/vercel/sandbox/${kit.appDir}` : "/vercel/sandbox";

    // Pass OpenAI key into the sandbox process so opencode can use it.
    const env: Record<string, string> = {};
    if (process.env.OPENAI_API_KEY) env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    const safe = text.replace(/"/g, '\\"');
    const cmd = `opencode run "${safe}"`;

    const res = await sandbox.runCommand({ cmd, cwd, env, detached: false });
    const stdout = await res.stdout();
    const stderr = await res.stderr();
    if (res.exitCode !== 0) {
      throw new Error(`opencode failed (exit ${res.exitCode})\n${stdout}\n${stderr}`);
    }

    const checkCwd = kit.check.cwd ? `/vercel/sandbox/${kit.check.cwd}` : "/vercel/sandbox";
    const checkRes = await sandbox.runCommand({ cmd: kit.check.cmd, cwd: checkCwd, env, detached: false });
    const cOut = await checkRes.stdout();
    const cErr = await checkRes.stderr();
    if (checkRes.exitCode !== 0) {
      throw new Error(`check failed (exit ${checkRes.exitCode})\n${cOut}\n${cErr}`);
    }

    return NextResponse.json({ ok: true, stdout: stdout + cOut, stderr: stderr + cErr });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}
