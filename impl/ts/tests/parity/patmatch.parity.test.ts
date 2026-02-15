import { describe, expect, test } from "bun:test";
import { runMbfParityFile } from "./_mbf_runner";

describe("Parity: patmatch (MBF source)", () => {
  test("patmatch.mr", () => {
    expect(runMbfParityFile("patmatch.mr")).toBe(true);
  });
});
