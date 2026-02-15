import { readFileSync } from "node:fs";
import { evaluateSerializedMakrellMacro } from "../src/macros";

function main(): void {
  try {
    const stdin = readFileSync(0, "utf8");
    const payload = JSON.parse(stdin) as {
      target: { name: string; params: string[]; body: unknown[] };
      args: unknown[];
      registry: Array<{ name: string; params: string[]; body: unknown[] }>;
    };
    const result = evaluateSerializedMakrellMacro({
      target: {
        name: payload.target.name,
        params: payload.target.params,
        body: payload.target.body as never,
      },
      args: payload.args as never,
      registry: payload.registry.map((x) => ({
        name: x.name,
        params: x.params,
        body: x.body as never,
      })),
    });
    process.stdout.write(JSON.stringify({ ok: true, result }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stdout.write(JSON.stringify({ ok: false, error: message }));
    process.exit(1);
  }
}

main();
