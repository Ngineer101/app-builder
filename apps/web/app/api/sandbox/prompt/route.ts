import { NextResponse } from "next/server";
import { Sandbox } from "@vercel/sandbox";
import { kits, KitId } from "@app-builder/core";
import { getSandboxAuth } from "../_lib/vercelSandboxAuth";

export const runtime = "nodejs";

function shQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const kitId = KitId.parse(body?.kitId);
    const kit = kits[kitId];
    const sandboxId = String(body.sandboxId);
    const text = String(body.text ?? "");
    const reviewMode = Boolean(body?.reviewMode);
    const devCmdId = typeof body?.devCmdId === "string" ? body.devCmdId : "";

    if (!sandboxId) throw new Error("sandboxId required");
    if (!text.trim()) throw new Error("text required");

    const auth = getSandboxAuth();
    const sandbox = await Sandbox.get({ sandboxId, ...auth });

    const cwd = reviewMode
      ? "/vercel/sandbox/repo"
      : (kit.appDir ? `/vercel/sandbox/${kit.appDir}` : "/vercel/sandbox");
    const startTs = new Date().toISOString();

    // Pass OpenAI key into the sandbox process so opencode can use it.
    const env: Record<string, string> = {};
    if (process.env.OPENAI_API_KEY)
      env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    env.OPENCODE_CONFIG_CONTENT = JSON.stringify({ permission: "allow" });

    const preflight = await sandbox.runCommand({
      cmd: "sh",
      args: [
        "-lc",
        "pwd; git rev-parse --is-inside-work-tree 2>/dev/null || true; ls -la",
      ],
      cwd,
      detached: false,
    });
    const preflightOut = await preflight.stdout();
    const preflightErr = await preflight.stderr();

    if (!reviewMode && kitId === "nextjs-golden") {
      await sandbox.runCommand({
        cmd: "sh",
        args: ["-lc", "rm -f index.html"],
        cwd,
        detached: false,
      });
    }

    const frameworkGuard = !reviewMode && kitId === "nextjs-golden"
      ? [
          "Project context:",
          "- Framework: Next.js App Router",
          "- Main landing page file: app/page.tsx",
          "- Global styles: app/globals.css",
          "Hard constraints:",
          "- Do NOT create index.html",
          "- Do NOT create a new entrypoint outside app/",
          "- Apply edits directly to app/page.tsx (and app/globals.css if needed)",
        ].join("\n")
      : "";

    const enforcedPrompt = [
      "You are editing an existing codebase in the current working directory.",
      "Do not ask clarifying questions.",
      "First inspect files, then apply concrete edits directly in this workspace.",
      "If assumptions are needed, make reasonable defaults and continue.",
      "Return only after changes are written.",
      frameworkGuard,
      "User request:",
      text,
    ].join("\n");

    const cmd = `opencode run --print-logs --agent build ${shQuote(enforcedPrompt)}`;

    const res = await sandbox.runCommand({
      cmd: "sh",
      args: ["-lc", cmd],
      cwd,
      env,
      detached: false,
    });
    const stdout = await res.stdout();
    const stderr = await res.stderr();

    if (
      /no files in the workspace/i.test(stdout) &&
      /package\.json|next\.config|app\//i.test(preflightOut)
    ) {
      throw new Error(
        `opencode reported empty workspace even though files exist in ${cwd}\n` +
          `Preflight:\n${preflightOut}\n${preflightErr}\n` +
          `opencode stdout:\n${stdout}\n` +
          `opencode stderr:\n${stderr}`,
      );
    }

    if (res.exitCode !== 0) {
      throw new Error(
        `opencode failed (exit ${res.exitCode})\n${stdout}\n${stderr}`,
      );
    }

    let cOut = "";
    let cErr = "";

    if (!reviewMode) {
      const checkCwd = kit.check.cwd
        ? `/vercel/sandbox/${kit.check.cwd}`
        : "/vercel/sandbox";
      const checkRes = await sandbox.runCommand({
        cmd: "sh",
        args: ["-lc", kit.check.cmd],
        cwd: checkCwd,
        env,
        detached: false,
      });
      cOut = await checkRes.stdout();
      cErr = await checkRes.stderr();
      if (checkRes.exitCode !== 0) {
        throw new Error(
          `check failed (exit ${checkRes.exitCode})\n${cOut}\n${cErr}`,
        );
      }
    }

    const changedRes = await sandbox.runCommand({
      cmd: "sh",
      args: ["-lc", "git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git status --porcelain || true"],
      cwd,
      detached: false,
    });
    const changedOut = await changedRes.stdout();
    let changedFiles = changedOut
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.slice(3));

    if (changedFiles.length === 0) {
      const fallbackChanged = await sandbox.runCommand({
        cmd: "sh",
        args: ["-lc", `find app -type f -newermt ${shQuote(startTs)} 2>/dev/null || true`],
        cwd,
        detached: false,
      });
      const fallbackOut = await fallbackChanged.stdout();
      changedFiles = fallbackOut
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^\.\//, ""));
    }

    if (!reviewMode && kitId === "nextjs-golden") {
      const badEntrypoint = await sandbox.runCommand({
        cmd: "sh",
        args: ["-lc", "if [ -f index.html ]; then echo index.html; fi"],
        cwd,
        detached: false,
      });
      const badOut = (await badEntrypoint.stdout()).trim();
      if (badOut === "index.html") {
        throw new Error("invalid edit target: opencode created index.html in a Next.js app");
      }
    }

    if (
      changedFiles.length === 0 &&
      /need .*context|share .*file|path to .*file|quick question/i.test(stdout)
    ) {
      throw new Error(
        "opencode did not edit any files and asked for more context. " +
          "The run is now treated as a failure so you can retry with a clearer prompt.",
      );
    }

    let newDevCmdId: string | null = null;
    if (!reviewMode) {
      if (devCmdId) {
        try {
          const existing = await sandbox.getCommand(devCmdId);
          await existing.kill("SIGTERM");
        } catch {
          // ignore: command may already be gone
        }
      }

      const devCwd = kit.dev.cwd
        ? `/vercel/sandbox/${kit.dev.cwd}`
        : "/vercel/sandbox";
      const newDevCmd = await sandbox.runCommand({
        cmd: "sh",
        args: ["-lc", kit.dev.cmd],
        cwd: devCwd,
        detached: true,
      });
      newDevCmdId = newDevCmd.cmdId;
    }

    return NextResponse.json({
      ok: true,
      stdout: `[preflight]\n${preflightOut}\n${stdout}${cOut}`,
      stderr: `${preflightErr}${stderr}${cErr}`,
      changedFiles,
      newDevCmdId,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 400 },
    );
  }
}
