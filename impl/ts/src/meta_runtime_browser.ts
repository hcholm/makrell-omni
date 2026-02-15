import { Node } from "./ast";
import { MakrellMacroEntry, MacroRegistry } from "./macros";
import { MetaRuntimeAdapter } from "./meta_runtime";

type WorkerLike = {
  postMessage: (msg: unknown) => void;
  onmessage: ((ev: { data: unknown }) => void) | null;
};

export class BrowserWorkerMetaRuntimeAdapter implements MetaRuntimeAdapter {
  kind = "browser-worker";
  private readonly worker: WorkerLike;
  private seq = 0;

  constructor(worker: WorkerLike) {
    this.worker = worker;
  }

  runMakrellMacro(name: string, macro: MakrellMacroEntry, args: Node[], registry: MacroRegistry): Node | Node[] {
    this.seq += 1;
    const id = `m${this.seq}`;
    const payload = {
      id,
      payload: {
        target: { name, params: macro.params, body: macro.body },
        args,
        registry: registry.serializeMakrellEntries(),
      },
    };

    // Synchronous bridge for current compile contract.
    // Browser integration should invoke compile through an async worker pipeline.
    let done = false;
    let result: Node | Node[] | null = null;
    let error: string | null = null;
    const prev = this.worker.onmessage;
    this.worker.onmessage = (ev) => {
      const data = ev.data as { id?: string; ok?: boolean; result?: Node | Node[]; error?: string };
      if (data.id !== id) return;
      done = true;
      if (data.ok) result = data.result ?? null;
      else error = data.error ?? "meta worker error";
    };
    this.worker.postMessage(payload);
    this.worker.onmessage = prev;
    if (!done) throw new Error("BrowserWorkerMetaRuntimeAdapter requires async compile pipeline");
    if (error) throw new Error(error);
    return result ?? [];
  }
}
