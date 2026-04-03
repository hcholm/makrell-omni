import { describe, expect, test } from "bun:test";
import { runMbfParityFileAsync } from "./_mbf_runner";

describe("Parity: coroutines (MBF source)", () => {
  test("coroutines.mr", async () => {
    await expect(runMbfParityFileAsync("coroutines.mr")).resolves.toBe(true);
  });
});
