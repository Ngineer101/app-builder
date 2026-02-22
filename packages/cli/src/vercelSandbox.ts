import { Sandbox } from "@vercel/sandbox";

export type CreateSandboxOpts = {
  runtime: "node24" | "node22" | "python3.13";
  ports: number[];
  timeoutMs?: number;
};

export async function createSandbox(opts: CreateSandboxOpts) {
  return Sandbox.create({
    runtime: opts.runtime,
    ports: opts.ports,
    timeout: opts.timeoutMs ?? 30 * 60 * 1000,
  });
}

export async function run(sandbox: Sandbox, params: { cmd: string; cwd?: string; sudo?: boolean; detached?: boolean }) {
  const cwd = params.cwd ? `/vercel/sandbox/${params.cwd}` : "/vercel/sandbox";
  return sandbox.runCommand({
    cmd: params.cmd,
    cwd,
    sudo: params.sudo,
    detached: params.detached,
  });
}
