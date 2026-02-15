import { compileToJs } from "./compiler";
import { matchPattern } from "./pattern";

export interface BrowserRunOptions {
  scope?: Record<string, unknown>;
}

export function compileForBrowser(src: string): string {
  return compileToJs(src);
}

export function runInBrowser(src: string, options: BrowserRunOptions = {}): unknown {
  const scope = options.scope ?? {};
  const fn = new Function(
    "__scope",
    "__makrell_matchPattern",
    `const __mr_matchPattern = __makrell_matchPattern; with (__scope) { return ${compileToJs(src)}; }`,
  ) as (scopeObj: Record<string, unknown>, matcher: typeof matchPattern) => unknown;
  return fn(scope, matchPattern);
}
