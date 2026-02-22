import { NextResponse } from "next/server";
import { Sandbox } from "@vercel/sandbox";
import { getSandboxAuth } from "../_lib/vercelSandboxAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const sandboxId = String(body?.sandboxId ?? "");
    if (!sandboxId) throw new Error("sandboxId required");

    const auth = getSandboxAuth();
    const sandbox = await Sandbox.get({ sandboxId, ...auth });
    await sandbox.stop();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}
