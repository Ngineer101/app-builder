#!/usr/bin/env node
import { Command } from "commander";
import { Sandbox } from "@vercel/sandbox";
import { kits, KitId } from "./kits.js";
import { createSandbox, run } from "./vercelSandbox.js";
import { readState, writeState } from "./state.js";

const program = new Command();

program.name("app-builder").description("AI App Builder POC (Vercel Sandbox)");

program
  .command("kits")
  .description("List available stack kits")
  .action(() => {
    for (const kit of Object.values(kits)) {
      console.log(`${kit.id}: ${kit.name}`);
    }
  });

program
  .command("create")
  .description("Create a new sandbox for a kit")
  .requiredOption("--kit <kit>", "Kit id")
  .option("--alias <name>", "Local alias to store in .app-builder/state.json", "default")
  .action(async (opts) => {
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
    const previewUrls: Record<string, string> = {};
    for (const p of kit.ports) previewUrls[p] = sandbox.domain(p);

    const state = readState();
    state.sandboxes[opts.alias] = {
      sandboxId: sandbox.sandboxId,
      kit: kitId,
      createdAt: new Date().toISOString(),
      ports: kit.ports,
      previewUrls,
    };
    writeState(state);

    console.log(`devCmdId: ${devCmd.cmdId}`);
    console.log(`preview:`);
    for (const [port, url] of Object.entries(previewUrls)) {
      console.log(`  ${port}: ${url}`);
    }
  });

program
  .command("prompt")
  .description("Run a prompt against a running sandbox using opencode (inside the sandbox)")
  .requiredOption("--alias <name>", "Alias from .app-builder/state.json")
  .requiredOption("--text <prompt>", "What to build/change")
  .action(async (opts) => {
    const state = readState();
    const entry = state.sandboxes[opts.alias];
    if (!entry) throw new Error(`unknown alias: ${opts.alias}`);

    const kit = kits[KitId.parse(entry.kit)];
    const sandbox = await Sandbox.get({ sandboxId: entry.sandboxId });

    // Run opencode inside the sandbox so auth/env comes from Vercel.
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

program
  .command("status")
  .description("Show saved sandboxes from .app-builder/state.json")
  .action(() => {
    const state = readState();
    console.log(JSON.stringify(state, null, 2));
  });

program
  .command("stop")
  .description("Stop a sandbox")
  .requiredOption("--alias <name>", "Alias from .app-builder/state.json")
  .action(async (opts) => {
    const state = readState();
    const entry = state.sandboxes[opts.alias];
    if (!entry) throw new Error(`unknown alias: ${opts.alias}`);

    const sandbox = await Sandbox.get({ sandboxId: entry.sandboxId });
    await sandbox.stop();
    console.log(`stopped: ${entry.sandboxId}`);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err?.stack ?? String(err));
  process.exit(1);
});
