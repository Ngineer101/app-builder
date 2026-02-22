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
      { cmd: "npm i -g pnpm" },
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
          "--yes",
        ].join(" "),
      },
      {
        cmd: "pnpm add drizzle-orm drizzle-kit better-auth sqlite3",
        cwd: "app",
      },
      // opencode is used for codegen/iteration inside the sandbox
      { cmd: "npm i -g opencode-ai" },
      // shadcn/ui (uses defaults; may still prompt on major changes)
      { cmd: "pnpm dlx shadcn@latest init -d", cwd: "app" },
    ],
    dev: { cmd: "pnpm dev --hostname 0.0.0.0 --port 3000", cwd: "app" },
    check: {
      cmd: "pnpm lint && pnpm -s exec tsc -p tsconfig.json --noEmit",
      cwd: "app",
    },
  },
  "vite-react": {
    id: "vite-react",
    name: "Vite React (placeholder kit)",
    runtime: "node24",
    ports: [5173],
    appDir: "app",
    setup: [
      { cmd: "npm i -g pnpm" },
      { cmd: "pnpm create vite@latest app -- --template react-ts" },
      { cmd: "pnpm install", cwd: "app" },
      { cmd: "npm i -g opencode-ai" },
    ],
    dev: { cmd: "pnpm dev --host 0.0.0.0 --port 5173", cwd: "app" },
    check: { cmd: "pnpm -s exec tsc -p tsconfig.json --noEmit", cwd: "app" },
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
        cwd: "app",
      },
    ],
    dev: {
      cmd: "./.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload",
      cwd: "app",
    },
    check: { cmd: "python -m compileall .", cwd: "app" },
  },
};
export { KitId, kits };
