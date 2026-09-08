import { describe, expect, it } from "vitest";
import { runInParallel } from "../../src/utils/parallel.js";

describe("runInParallel", () => {
  it("preserves input order while limiting concurrency", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await runInParallel(
      [1, 2, 3, 4, 5],
      async (item) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return item * 2;
      },
      2,
    );

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
