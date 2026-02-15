import { describe, expect, test } from "bun:test";
import {
  InProcessMetaRuntimeAdapter,
  runMbfParityFile,
  SubprocessMetaRuntimeAdapter,
} from "./_mbf_runner";

describe("Parity: meta/macros (MBF source)", () => {
  test("meta.mr with in-process adapter", () => {
    expect(runMbfParityFile("meta.mr", new InProcessMetaRuntimeAdapter())).toBe(true);
  });

  test("meta.mr with subprocess adapter", () => {
    expect(runMbfParityFile("meta.mr", new SubprocessMetaRuntimeAdapter())).toBe(true);
  });
});
