import { describe, expect, it } from "vitest";
import { aggregateRepositories } from "../../src/core/aggregator.js";
import { RepoStats } from "../../src/types.js";

const repoStats: RepoStats = {
  name: "repo",
  path: "/tmp/repo",
  commits: [],
  analysisFailures: [],
  totalCommits: 2,
  totalFilesChanged: 3,
  totalLinesAdded: 10,
  totalLinesDeleted: 4,
  netChange: 6,
};

describe("aggregateRepositories", () => {
  it("aggregates successful repos and failed repo records", () => {
    const stats = aggregateRepositories([repoStats], [
      { path: "/tmp/broken", message: "not readable" },
    ]);

    expect(stats).toMatchObject({
      totalRepositories: 1,
      totalFailedRepositories: 1,
      totalCommits: 2,
      netChange: 6,
      failedRepositories: [{ path: "/tmp/broken", message: "not readable" }],
    });
  });
});
