"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { KitId } from "@app-builder/core";
import { kits } from "@app-builder/core";

type CreateResp = { sandboxId: string; previewUrls: Record<string, string>; kitId: KitId; devCmdId: string };

type PromptResp = { ok: true; stdout: string; stderr: string };

type ApiErr = { error: string };

export default function HomePage() {
  const kitList = useMemo(() => Object.values(kits), []);

  const [kitId, setKitId] = useState<KitId>(kitList[0]!.id);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreateResp | null>(null);
  const [prompt, setPrompt] = useState("Add a landing page with a simple hero and a call-to-action button.");
  const [logs, setLogs] = useState<string>("");

  // hydrate from localStorage (best-effort)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("app-builder:poc");
      if (!raw) return;
      const data = JSON.parse(raw) as { created?: CreateResp; kitId?: KitId; prompt?: string; logs?: string };
      if (data.kitId) setKitId(data.kitId);
      if (typeof data.prompt === "string") setPrompt(data.prompt);
      if (typeof data.logs === "string") setLogs(data.logs);
      if (data.created?.sandboxId) setCreated(data.created);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "app-builder:poc",
        JSON.stringify({ kitId, prompt, logs, created }, null, 0)
      );
    } catch {
      // ignore
    }
  }, [kitId, prompt, logs, created]);

  async function create() {
    setBusy(true);
    setLogs("");
    try {
      const res = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kitId }),
      });
      const json = (await res.json()) as CreateResp | ApiErr;
      if (!res.ok) throw new Error((json as ApiErr).error);
      setCreated(json as CreateResp);
      setLogs((l) => l + `Created sandbox: ${(json as CreateResp).sandboxId}\n`);
    } finally {
      setBusy(false);
    }
  }

  async function runPrompt() {
    if (!created) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sandbox/prompt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sandboxId: created.sandboxId, kitId: created.kitId, text: prompt }),
      });
      const json = (await res.json()) as PromptResp | ApiErr;
      if (!res.ok) throw new Error((json as ApiErr).error);

      const out = (json as PromptResp).stdout?.trim() ? `\n[stdout]\n${(json as PromptResp).stdout}` : "";
      const err = (json as PromptResp).stderr?.trim() ? `\n[stderr]\n${(json as PromptResp).stderr}` : "";
      setLogs((l) => l + `\n---\nPrompt: ${prompt}\n${out}${err}\n`);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!created) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sandbox/stop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sandboxId: created.sandboxId }),
      });
      const json = (await res.json()) as { ok: true } | ApiErr;
      if (!res.ok) throw new Error((json as ApiErr).error);
      setLogs((l) => l + `\nStopped sandbox: ${created.sandboxId}\n`);
      setCreated(null);
    } finally {
      setBusy(false);
    }
  }

  function forgetLocal() {
    try {
      localStorage.removeItem("app-builder:poc");
    } catch {
      // ignore
    }
    setCreated(null);
    setLogs("");
  }

  const previewUrl = created ? Object.values(created.previewUrls)[0] : null;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Vercel Sandbox POC
          </div>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight">App Builder</h1>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Spin up an ephemeral sandbox, generate code with opencode, and preview the running dev server.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="block text-xs text-white/60">Stack Kit</label>
          <select
            className="mt-2 w-[320px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
            value={kitId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setKitId(e.target.value as KitId)}
            disabled={busy}
          >
            {kitList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.id}
              </option>
            ))}
          </select>

          <div className="mt-3 flex gap-2">
            <button
              className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
              onClick={create}
              disabled={busy}
            >
              {created ? "Recreate" : "Create sandbox"}
            </button>
            <button
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm disabled:opacity-50"
              onClick={stop}
              disabled={!created || busy}
            >
              Stop
            </button>
          </div>

          {created && (
            <div className="mt-3 text-xs text-white/60">
              <div>
                <span className="text-white/40">sandboxId:</span> {created.sandboxId}
              </div>
              {previewUrl && (
                <div className="mt-1 truncate">
                  <span className="text-white/40">preview:</span> {previewUrl}
                </div>
              )}
              <div className="mt-2">
                <button
                  className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/70 hover:bg-black/30"
                  onClick={forgetLocal}
                  disabled={busy}
                  title="Clear local saved session"
                >
                  Forget local session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Prompt</h2>
            <button
              className="rounded-xl bg-emerald-400/90 px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
              onClick={runPrompt}
              disabled={!created || busy}
            >
              Run
            </button>
          </div>
          <textarea
            className="mt-3 h-40 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!created || busy}
          />
          <p className="mt-2 text-xs text-white/50">
            This runs <code className="rounded bg-black/40 px-1 py-0.5">opencode run</code> inside the sandbox and then executes the kit check command.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-medium">Preview</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {previewUrl ? (
              <iframe className="h-[420px] w-full" src={previewUrl} />
            ) : (
              <div className="flex h-[420px] items-center justify-center text-sm text-white/50">Create a sandbox to see preview</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Logs</h2>
            <button
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => setLogs("")}
              disabled={!logs || busy}
            >
              Clear
            </button>
          </div>
          <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-white/10 bg-black/60 p-3 text-xs leading-relaxed text-white/80">
            {logs || "(no logs yet)"}
          </pre>
        </div>
      </div>

      <footer className="mt-10 text-xs text-white/40">
        Tip: add <code className="rounded bg-black/40 px-1 py-0.5">OPENAI_API_KEY</code> to the Vercel project env vars so opencode can authenticate.
      </footer>
    </div>
  );
}
