"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(evt: any) {
    evt.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Username plugin provides signIn.username; email/password uses signIn.email
      // We'll choose based on presence of '@'.
      if (identifier.includes("@")) {
        const res = await authClient.signIn.email({
          email: identifier,
          password,
        });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.username({
          username: identifier,
          password,
        });
        if (res.error) throw new Error(res.error.message);
      }

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
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-white/60">
        Use username or email + password.
      </p>

      <form className="mt-6 grid gap-3" onSubmit={signIn}>
        <input
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/40"
          placeholder="username or email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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
          disabled={busy || !identifier || !password}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="text-xs text-white/50">
          No account?{" "}
          <a className="text-emerald-300 hover:underline" href="/sign-up">
            Sign up
          </a>
        </div>
      </form>
    </div>
  );
}
