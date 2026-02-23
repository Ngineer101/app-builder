"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { on } from "node:process";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signUp(ev: any) {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.signUp.email({
        name,
        email,
        password,
        username: username || undefined,
      } as any);
      if (res.error) throw new Error(res.error.message);

      router.push("/");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>
      <p className="mt-2 text-sm text-white/60">
        Create an account to manage sandboxes.
      </p>

      <form className="mt-6 grid gap-3" onSubmit={signUp}>
        <input
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <input
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
          placeholder="username (optional)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <input
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <button
          className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
          type="submit"
          disabled={busy || !name || !email || !password}
        >
          {busy ? "Creating account…" : "Sign up"}
        </button>

        <div className="text-xs text-white/50">
          Already have an account?{" "}
          <a className="text-emerald-300 hover:underline" href="/sign-in">
            Sign in
          </a>
        </div>
      </form>
    </div>
  );
}
