#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";
import { Sandbox as Sandbox2 } from "@vercel/sandbox";

// src/kits.ts
import { z } from "zod";
var KitId = z.enum(["nextjs-golden", "vite-react", "fastapi"]);
var kits = {
  "nextjs-golden": {
    id: "nextjs-golden",
    name: "Golden Path: Next.js + shadcn/ui + Tailwind + SQLite + Drizzle + better-auth",
    runtime: "node24",
    ports: [3e3],
    appDir: "app",
    setup: [
      { cmd: "corepack enable" },
      {
        cmd: [
          "pnpm dlx create-next-app@latest app",
          "--ts",
          "--tailwind",
          "--eslint",
          "--app",
          "--no-src-dir",
          "--import-alias @/*",
          "--use-pnpm",
          "--yes"
        ].join(" ")
      },
      { cmd: "pnpm add drizzle-orm drizzle-kit better-auth sqlite3", cwd: "app" },
      // opencode is used for codegen/iteration inside the sandbox
      { cmd: "npm i -g opencode" },
      // shadcn/ui (non-interactive; this will generate components.json)
      {
        cmd: "pnpm dlx shadcn@latest init -d",
        cwd: "app"
      }
    ],
    dev: { cmd: "pnpm dev --port 3000", cwd: "app" },
    check: { cmd: "pnpm lint && pnpm -s exec tsc -p tsconfig.json --noEmit", cwd: "app" }
  },
  "vite-react": {
    id: "vite-react",
    name: "Vite React (placeholder kit)",
    runtime: "node24",
    ports: [5173],
    appDir: "app",
    setup: [
      { cmd: "corepack enable" },
      { cmd: "pnpm create vite@latest app -- --template react-ts" },
      { cmd: "pnpm install", cwd: "app" },
      { cmd: "npm i -g opencode" }
    ],
    dev: { cmd: "pnpm dev --host 0.0.0.0 --port 5173", cwd: "app" },
    check: { cmd: "pnpm -s exec tsc -p tsconfig.json --noEmit", cwd: "app" }
  },
  fastapi: {
    id: "fastapi",
    name: "FastAPI (placeholder kit)",
    runtime: "python3.13",
    ports: [8e3],
    appDir: "app",
    setup: [
      { cmd: "mkdir -p app" },
      { cmd: "python -m venv .venv", cwd: "app" },
      { cmd: "./.venv/bin/pip install fastapi uvicorn", cwd: "app" },
      {
        cmd: `python -c "from pathlib import Path; Path('main.py').write_text('from fastapi import FastAPI\\n\\napp = FastAPI()\\n\\n@app.get(\\"/\\")\\ndef root():\\n    return {\\"ok\\": True}\\n')"`,
        cwd: "app"
      }
    ],
    dev: {
      cmd: "./.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload",
      cwd: "app"
    },
    check: { cmd: "python -m compileall .", cwd: "app" }
  }
};

// src/vercelSandbox.ts
import { Sandbox } from "@vercel/sandbox";
async function createSandbox(opts) {
  return Sandbox.create({
    runtime: opts.runtime,
    ports: opts.ports,
    timeout: opts.timeoutMs ?? 30 * 60 * 1e3
  });
}
async function run(sandbox, params) {
  const cwd = params.cwd ? `/vercel/sandbox/${params.cwd}` : "/vercel/sandbox";
  return sandbox.runCommand({
    cmd: params.cmd,
    cwd,
    sudo: params.sudo,
    detached: params.detached
  });
}

// src/state.ts
import fs from "fs";
import path from "path";
var defaultState = { sandboxes: {} };
function statePath() {
  const dir = path.join(process.cwd(), ".app-builder");
  return {
    dir,
    file: path.join(dir, "state.json")
  };
}
function readState() {
  const { file } = statePath();
  if (!fs.existsSync(file)) return defaultState;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeState(next) {
  const { dir, file } = statePath();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2));
}

// src/index.ts
var program = new Command();
program.name("app-builder").description("AI App Builder POC (Vercel Sandbox)");
program.command("kits").description("List available stack kits").action(() => {
  for (const kit of Object.values(kits)) {
    console.log(`${kit.id}: ${kit.name}`);
  }
});
program.command("create").description("Create a new sandbox for a kit").requiredOption("--kit <kit>", "Kit id").option("--alias <name>", "Local alias to store in .app-builder/state.json", "default").action(async (opts) => {
  const kitId = KitId.parse(opts.kit);
  const kit = kits[kitId];
  const sandbox = await createSandbox({ runtime: kit.runtime, ports: kit.ports });
  console.log(`sandboxId: ${sandbox.sandboxId}`);
  for (const step of kit.setup) {
    console.log(`setup: ${step.cmd}`);
    const res = await run(sandbox, { ...step, detached: false });
    const out = await res.stdout();
    const err = await res.stderr();
    if (out.trim()) process.stdout.write(out);
    if (err.trim()) process.stderr.write(err);
    if (res.exitCode !== 0) {
      throw new Error(`setup failed (exit ${res.exitCode}): ${step.cmd}`);
    }
  }
  console.log(`dev: ${kit.dev.cmd}`);
  const devCmd = await run(sandbox, { ...kit.dev, detached: true });
  const previewUrls = {};
  for (const p of kit.ports) previewUrls[p] = sandbox.domain(p);
  const state = readState();
  state.sandboxes[opts.alias] = {
    sandboxId: sandbox.sandboxId,
    kit: kitId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    ports: kit.ports,
    previewUrls
  };
  writeState(state);
  console.log(`devCmdId: ${devCmd.cmdId}`);
  console.log(`preview:`);
  for (const [port, url] of Object.entries(previewUrls)) {
    console.log(`  ${port}: ${url}`);
  }
});
program.command("prompt").description("Run a prompt against a running sandbox using opencode (inside the sandbox)").requiredOption("--alias <name>", "Alias from .app-builder/state.json").requiredOption("--text <prompt>", "What to build/change").action(async (opts) => {
  const state = readState();
  const entry = state.sandboxes[opts.alias];
  if (!entry) throw new Error(`unknown alias: ${opts.alias}`);
  const kit = kits[KitId.parse(entry.kit)];
  const sandbox = await Sandbox2.get({ sandboxId: entry.sandboxId });
  const prompt = String(opts.text).replace(/"/g, '\\"');
  const cmd = `opencode run "${prompt}"`;
  console.log(`opencode: ${cmd}`);
  const res = await run(sandbox, { cmd, cwd: kit.appDir, detached: false });
  process.stdout.write(await res.stdout());
  process.stderr.write(await res.stderr());
  if (res.exitCode !== 0) throw new Error(`opencode failed (exit ${res.exitCode})`);
  console.log(`check: ${kit.check.cmd}`);
  const checkRes = await run(sandbox, { ...kit.check, detached: false });
  process.stdout.write(await checkRes.stdout());
  process.stderr.write(await checkRes.stderr());
  if (checkRes.exitCode !== 0) {
    throw new Error(`check failed (exit ${checkRes.exitCode})`);
  }
  console.log(`ok`);
});
program.command("status").description("Show saved sandboxes from .app-builder/state.json").action(() => {
  const state = readState();
  console.log(JSON.stringify(state, null, 2));
});
program.command("stop").description("Stop a sandbox").requiredOption("--alias <name>", "Alias from .app-builder/state.json").action(async (opts) => {
  const state = readState();
  const entry = state.sandboxes[opts.alias];
  if (!entry) throw new Error(`unknown alias: ${opts.alias}`);
  const sandbox = await Sandbox2.get({ sandboxId: entry.sandboxId });
  await sandbox.stop();
  console.log(`stopped: ${entry.sandboxId}`);
});
program.parseAsync(process.argv).catch((err) => {
  console.error(err?.stack ?? String(err));
  process.exit(1);
});
