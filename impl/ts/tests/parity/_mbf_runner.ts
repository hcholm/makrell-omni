import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  InProcessMetaRuntimeAdapter,
  MetaRuntimeAdapter,
  run,
  SubprocessMetaRuntimeAdapter,
} from "../../src/index";

function assertFn(cond: unknown, msg?: unknown): boolean {
  if (!cond) throw new Error(msg ? String(msg) : "assert failed");
  return true;
}

export function runMbfParityFile(relPath: string, metaRuntime?: MetaRuntimeAdapter): unknown {
  const full = join(import.meta.dir, "mbf", relPath);
  const src = readFileSync(full, "utf8");
  return run(src, {
    metaRuntime,
    scope: {
      assert: assertFn,
      print: (...args: unknown[]) => {
        console.log(...args);
        return args.length > 0 ? args[args.length - 1] : null;
      },
      Math,
      JSON,
      Date,
    },
  });
}

export { InProcessMetaRuntimeAdapter, SubprocessMetaRuntimeAdapter };
