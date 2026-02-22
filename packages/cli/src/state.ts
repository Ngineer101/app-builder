import fs from "node:fs";
import path from "node:path";

export type AppBuilderState = {
  sandboxes: Record<
    string,
    {
      sandboxId: string;
      kit: string;
      createdAt: string;
      ports?: number[];
      previewUrls?: Record<string, string>;
    }
  >;
};

const defaultState: AppBuilderState = { sandboxes: {} };

export function statePath() {
  const dir = path.join(process.cwd(), ".app-builder");
  return {
    dir,
    file: path.join(dir, "state.json"),
  };
}

export function readState(): AppBuilderState {
  const { file } = statePath();
  if (!fs.existsSync(file)) return defaultState;
  return JSON.parse(fs.readFileSync(file, "utf8")) as AppBuilderState;
}

export function writeState(next: AppBuilderState) {
  const { dir, file } = statePath();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2));
}
