import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Node } from "./ast";
import {
  MacroRegistry,
  MakrellMacroEntry,
  SerializedMakrellMacro,
  evaluateSerializedMakrellMacro,
} from "./macros";

export interface MetaRuntimeAdapter {
  kind: string;
  runMakrellMacro(name: string, macro: MakrellMacroEntry, args: Node[], registry: MacroRegistry): Node | Node[];
}

export class InProcessMetaRuntimeAdapter implements MetaRuntimeAdapter {
  kind = "inprocess";

  runMakrellMacro(_name: string, macro: MakrellMacroEntry, args: Node[], registry: MacroRegistry): Node | Node[] {
    return evaluateSerializedMakrellMacro({
      target: { name: _name, params: macro.params, body: macro.body },
      args,
      registry: registry.serializeMakrellEntries(),
    });
  }
}

export class SubprocessMetaRuntimeAdapter implements MetaRuntimeAdapter {
  kind = "subprocess";
  private readonly runnerPath: string;

  constructor() {
    const here = dirname(fileURLToPath(import.meta.url));
    this.runnerPath = join(here, "..", "scripts", "meta-runner.ts");
  }

  runMakrellMacro(name: string, macro: MakrellMacroEntry, args: Node[], registry: MacroRegistry): Node | Node[] {
    // Bun runtime is required for TS runner execution in the subprocess.
    const isBun = Boolean((process as { versions?: { bun?: string } }).versions?.bun);
    if (!isBun) {
      const fallback = new InProcessMetaRuntimeAdapter();
      return fallback.runMakrellMacro(name, macro, args, registry);
    }

    const payload: {
      target: SerializedMakrellMacro;
      args: Node[];
      registry: SerializedMakrellMacro[];
    } = {
      target: { name, params: macro.params, body: macro.body },
      args,
      registry: registry.serializeMakrellEntries(),
    };

    const child = spawnSync(
      process.execPath,
      ["run", this.runnerPath],
      {
        input: JSON.stringify(payload),
        encoding: "utf8",
      },
    );

    if (child.status !== 0) {
      const stderr = child.stderr?.toString().trim() ?? "";
      throw new Error(`Meta subprocess failed: ${stderr || "unknown error"}`);
    }

    const raw = child.stdout?.toString().trim() ?? "";
    if (!raw) throw new Error("Meta subprocess returned empty output");

    const parsed = JSON.parse(raw) as { ok: boolean; result?: Node | Node[]; error?: string };
    if (!parsed.ok) {
      throw new Error(`Meta subprocess error: ${parsed.error ?? "unknown"}`);
    }
    return parsed.result as Node | Node[];
  }
}

export function createDefaultMetaRuntimeAdapter(): MetaRuntimeAdapter {
  return new SubprocessMetaRuntimeAdapter();
}
