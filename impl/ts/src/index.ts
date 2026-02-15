import { compileToDts, compileToJs, compileToTs, CompileOptions } from "./compiler";
import { MacroRegistry } from "./macros";
import {
  InProcessMetaRuntimeAdapter,
  MetaRuntimeAdapter,
  SubprocessMetaRuntimeAdapter,
} from "./meta_runtime";
import { parse } from "./parser";
import { clearPatternHooks, matchPattern, registerPatternHook } from "./pattern";

export {
  parse,
  compileToJs as compile,
  compileToTs,
  compileToDts,
  MacroRegistry,
  matchPattern,
  registerPatternHook,
  clearPatternHooks,
  InProcessMetaRuntimeAdapter,
  SubprocessMetaRuntimeAdapter,
};
export type { CompileOptions } from "./compiler";
export type { MetaRuntimeAdapter } from "./meta_runtime";

export interface RunOptions extends CompileOptions {
  scope?: Record<string, unknown>;
}

function getDefaultModuleResolver(scopeObj: Record<string, unknown>): (moduleName: string) => Record<string, unknown> {
  return (moduleName: string): Record<string, unknown> => {
    const reg = scopeObj.__mr_modules as Record<string, unknown> | undefined;
    if (reg && moduleName in reg) {
      return reg[moduleName] as Record<string, unknown>;
    }

    const req = (globalThis as unknown as { require?: (name: string) => unknown }).require;
    if (typeof req === "function") {
      return req(moduleName) as Record<string, unknown>;
    }

    throw new Error(`No module resolver for '${moduleName}'. Provide scope.__mr_modules or options.moduleResolver.`);
  };
}

export function run(src: string, options: RunOptions = {}): unknown {
  const scope = options.scope ?? {};
  const moduleResolver = options.moduleResolver ?? getDefaultModuleResolver(scope);
  const metaModuleResolver = options.metaModuleResolver ?? ((name: string) => moduleResolver(name) as { __mr_meta__?: unknown[] });
  const metaRuntime = options.metaRuntime ?? new SubprocessMetaRuntimeAdapter();

  const js = compileToJs(src, {
    ...options,
    metaRuntime,
    moduleResolver,
    metaModuleResolver,
  });

  const importFn = (moduleName: string, alias?: string): unknown => {
    const mod = moduleResolver(moduleName);
    const key = alias && alias.length > 0 ? alias : moduleName;
    scope[key] = mod;
    return mod;
  };

  const importFromFn = (moduleName: string, names: string[]): null => {
    const mod = moduleResolver(moduleName) as Record<string, unknown>;
    for (const n of names) scope[n] = mod[n];
    return null;
  };

  scope.__mr_import = importFn;
  scope.__mr_import_from = importFromFn;

  const fn = new Function(
    "__scope",
    "__makrell_matchPattern",
    `const __mr_matchPattern = __makrell_matchPattern; with (__scope) { return ${js}; }`,
  ) as (scopeObj: Record<string, unknown>, matcher: typeof matchPattern) => unknown;

  return fn(scope, matchPattern);
}
