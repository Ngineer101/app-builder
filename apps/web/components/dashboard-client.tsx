"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import type { KitId } from "@app-builder/core";
import { kits } from "@app-builder/core";

type CreateResp = { sandboxId: string; previewUrls: Record<string, string>; kitId: KitId; devCmdId?: string };
type ApiErr = { error: string };

type User = { id: string; name: string };

type SandboxRow = {
  id: string;
  kitId: KitId;
  sandboxId: string;
  previewUrl: string | null;
  createdAt: string;
  lastActiveAt: string;
  stoppedAt: string | null;
};

function parseSseLine(line: string) {
  // SSE: `data: ...` lines; ignore others
  if (!line.startsWith("data:")) return null;
  const data = line.slice(5).trim();
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return { type: "log", message: data };
  }
}

async function fetchSse(url: string, init: RequestInit, onEvent: (evt: any) => void) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      accept: "text/event-stream",
    },
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as ApiErr | null;
    throw new Error(json?.error ?? `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // process complete lines
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trimEnd();
      buf = buf.slice(idx + 1);
      const evt = parseSseLine(line);
      if (evt) onEvent(evt);
    }
  }
}

export default function DashboardClient({ user }: { user: User }) {
  const kitList = useMemo(() => Object.values(kits), []);

  const [kitId, setKitId] = useState<KitId>(kitList[0]!.id);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreateResp | null>(null);
  const [prompt, setPrompt] = useState("Add a landing page with a simple hero and a call-to-action button.");
  const [logs, setLogs] = useState<string>("");
  const [sandboxes, setSandboxes] = useState<SandboxRow[]>([]);

  // hydrate selected sandbox from localStorage only (UI convenience)
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

  useEffect(() => {
    try {
      localStorage.setItem("app-builder:poc", JSON.stringify({ kitId, prompt, logs, created }));
    } catch {
      // ignore
    }
  }, [kitId, prompt, logs, created]);

  async function refreshList() {
    const res = await fetch("/api/sandbox/list", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { sandboxes: SandboxRow[] };
    setSandboxes(json.sandboxes);
  }

  useEffect(() => {
    void refreshList();
  }, []);

  async function createSandbox() {
    setBusy(true);
    setLogs("");
    setCreated(null);
    try {
      const events: any[] = [];
      await fetchSse(
        "/api/sandbox/create",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kitId }),
        },
        (evt) => {
          events.push(evt);
          if (evt.type === "result") {
            setCreated(evt.result as CreateResp);
          }
          if (evt.type === "log") {
            setLogs((l) => l + evt.message);
          } else if (evt.type === "step") {
            setLogs((l) => l + `\n[${evt.stage}] ${evt.message}`);
          }
        }
      );

      await refreshList();
    } finally {
      setBusy(false);
    }
  }

  async function runPrompt() {
    if (!created) return;
    setBusy(true);
    try {
      await fetchSse(
        "/api/sandbox/prompt",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sandboxId: created.sandboxId, kitId: created.kitId, text: prompt }),
        },
        (evt) => {
          if (evt.type === "log") setLogs((l) => l + evt.message);
          if (evt.type === "step") setLogs((l) => l + `\n[${evt.stage}] ${evt.message}`);
        }
      );

      await refreshList();
    } finally {
      setBusy(false);
    }
  }

  async function stopSandbox(sandboxId?: string) {
    const id = sandboxId ?? created?.sandboxId;
    if (!id) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sandbox/stop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sandboxId: id }),
      });
      const json = (await res.json()) as { ok: true } | ApiErr;
      if (!res.ok) throw new Error((json as ApiErr).error);
      setLogs((l) => l + `\nStopped sandbox: ${id}\n`);
      if (created?.sandboxId === id) setCreated(null);
      await refreshList();
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
            Signed in as {user.name || user.id}
          </div>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight">App Builder</h1>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Create sandboxes, generate code with opencode, and preview dev servers.
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
              onClick={createSandbox}
              disabled={busy}
            >
              {busy ? "Working…" : "Create sandbox"}
            </button>
            <button
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => stopSandbox()}
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
                  title="Clear local saved selection"
                >
                  Forget local selection
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
              {busy ? "Running…" : "Run"}
            </button>
          </div>
          <textarea
            className="mt-3 h-40 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!created || busy}
          />
          <p className="mt-2 text-xs text-white/50">
            This streams logs while running <code className="rounded bg-black/40 px-1 py-0.5">opencode run</code> and then the kit check.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-medium">Preview</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {previewUrl ? (
              <iframe className="h-[420px] w-full" src={previewUrl} />
            ) : (
              <div className="flex h-[420px] items-center justify-center text-sm text-white/50">Create/select a sandbox to see preview</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Your sandboxes</h2>
            <button
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm disabled:opacity-50"
              onClick={refreshList}
              disabled={busy}
            >
              Refresh
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {sandboxes.length === 0 && <div className="text-sm text-white/50">No sandboxes yet.</div>}
            {sandboxes.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm">
                    <span className="text-white/80">{s.kitId}</span>
                    <span className="text-white/30"> · </span>
                    <span className="text-white/50 truncate">{s.sandboxId}</span>
                  </div>
                  <div className="text-xs text-white/40">
                    last active: {new Date(s.lastActiveAt).toLocaleString()} {s.stoppedAt ? "(stopped)" : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/70 disabled:opacity-50"
                    onClick={() =>
                      setCreated({
                        sandboxId: s.sandboxId,
                        kitId: s.kitId,
                        previewUrls: s.previewUrl ? { "0": s.previewUrl } : {},
                      })
                    }
                    disabled={busy || !!s.stoppedAt}
                    title="Select sandbox (preview URL will populate after next create or if you know it)"
                  >
                    Select
                  </button>
                  <button
                    className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/70 disabled:opacity-50"
                    onClick={() => stopSandbox(s.sandboxId)}
                    disabled={busy || !!s.stoppedAt}
                  >
                    Stop
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
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
        Sandboxes auto-stop after 15 minutes of inactivity.
      </footer>
    </div>
  );
}
