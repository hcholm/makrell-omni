import { evaluateSerializedMakrellMacro } from "./macros";

type RequestMessage = {
  id: string;
  payload: Parameters<typeof evaluateSerializedMakrellMacro>[0];
};

type ResponseMessage =
  | { id: string; ok: true; result: ReturnType<typeof evaluateSerializedMakrellMacro> }
  | { id: string; ok: false; error: string };

// Browser worker entrypoint for meta macro evaluation.
self.onmessage = (ev: MessageEvent<RequestMessage>) => {
  const msg = ev.data;
  let out: ResponseMessage;
  try {
    const result = evaluateSerializedMakrellMacro(msg.payload);
    out = { id: msg.id, ok: true, result };
  } catch (err) {
    out = { id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  (self as unknown as { postMessage: (x: ResponseMessage) => void }).postMessage(out);
};
