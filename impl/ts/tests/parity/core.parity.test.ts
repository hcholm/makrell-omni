import { describe, expect, test } from "bun:test";
import { runMbfParityFile } from "./_mbf_runner";

describe("Parity: core (MBF source)", () => {
  test("core.mr", () => {
    expect(runMbfParityFile("core.mr")).toBe(true);
  });
});
