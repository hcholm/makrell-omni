#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { compile, runAsync } from "./index";
import { CompileFailure } from "./compiler";

type CliSeverity = "error";

interface CliRangePosition {
  line: number;
  column: number;
}

interface CliDiagnostic {
  message: string;
  severity: CliSeverity;
  range?: {
    start: CliRangePosition;
    end: CliRangePosition;
  };
}

function extractRangeFromMessage(message: string): CliDiagnostic["range"] | undefined {
  const match = /(?:at|\[line)\s+line\s+(\d+),\s*col\s+(\d+)|at line\s+(\d+),\s*col\s+(\d+)/i.exec(message);
  const line = match?.[1] ?? match?.[3];
  const column = match?.[2] ?? match?.[4];
  if (!line || !column) {
    return undefined;
  }

  const parsedLine = Number.parseInt(line, 10);
  const parsedColumn = Number.parseInt(column, 10);
  if (!Number.isFinite(parsedLine) || !Number.isFinite(parsedColumn)) {
    return undefined;
  }

  return {
    start: { line: parsedLine, column: parsedColumn },
    end: { line: parsedLine, column: parsedColumn },
  };
}

function printHelp(): void {
  console.log("Usage: bun run src/cli.ts <file.mrts> [--emit-js]");
  console.log("       bun run src/cli.ts check <file.mrts> [--json]");
}

function toCliDiagnostic(error: unknown): CliDiagnostic {
  if (error instanceof CompileFailure) {
    const loc = error.diagnostic.loc;
    return {
      message: error.diagnostic.message,
      severity: "error",
      range: loc
        ? {
            start: { line: loc.start.line, column: loc.start.column },
            end: { line: loc.end.line, column: loc.end.column },
          }
        : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      severity: "error",
      range: extractRangeFromMessage(error.message),
    };
  }

  return {
    message: String(error),
    severity: "error",
  };
}

function printCheckResult(ok: boolean, diagnostics: CliDiagnostic[], asJson: boolean): never {
  if (asJson) {
    console.log(JSON.stringify({ ok, diagnostics }, null, 2));
  } else if (ok) {
    console.log("OK");
  } else {
    for (const diagnostic of diagnostics) {
      const start = diagnostic.range?.start;
      const end = diagnostic.range?.end;
      const where = start
        ? ` ${start.line}:${start.column}-${end?.line ?? start.line}:${end?.column ?? start.column}`
        : "";
      console.log(`${diagnostic.severity}${where} ${diagnostic.message}`);
    }
  }

  process.exit(ok ? 0 : 1);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  printHelp();
  process.exit(0);
}

if (args[0] === "check") {
  const file = args[1];
  if (!file) {
    printHelp();
    process.exit(1);
  }

  const asJson = args.includes("--json");
  const src = readFileSync(file, "utf8");

  try {
    compile(src);
    printCheckResult(true, [], asJson);
  } catch (error) {
    printCheckResult(false, [toCliDiagnostic(error)], asJson);
  }
}

const file = args[0];
const emit = args.includes("--emit-js");
const src = readFileSync(file, "utf8");

if (emit) {
  console.log(compile(src));
  process.exit(0);
}

const result = await runAsync(src, {
  scope: {
    console,
    Math,
    JSON,
    Date,
    Promise,
    print: (...args: unknown[]) => {
      console.log(...args);
      return args.length > 0 ? args[args.length - 1] : null;
    },
  },
});
if (result !== undefined) {
  console.log(result);
}
