import { compileToJs, CompileOptions } from "./compiler";
import { MacroRegistry } from "./macros";
import {
  InProcessMetaRuntimeAdapter,
  MetaRuntimeAdapter,
  SubprocessMetaRuntimeAdapter,
} from "./meta_runtime";
import { parse } from "./parser";
import { matchPattern } from "./pattern";

export {
  parse,
  compileToJs as compile,
  MacroRegistry,
  matchPattern,
  InProcessMetaRuntimeAdapter,
  SubprocessMetaRuntimeAdapter,
};
export type { CompileOptions } from "./compiler";
export type { MetaRuntimeAdapter } from "./meta_runtime";

export interface RunOptions extends CompileOptions {
  scope?: Record<string, unknown>;
}

export function run(src: string, options: RunOptions = {}): unknown {
  const js = compileToJs(src, options);
  const scope = options.scope ?? {};

  const fn = new Function(
    "__scope",
    "__makrell_matchPattern",
    `const __mr_matchPattern = __makrell_matchPattern; with (__scope) { return ${js}; }`,
  ) as (scopeObj: Record<string, unknown>, matcher: typeof matchPattern) => unknown;

  return fn(scope, matchPattern);
}
