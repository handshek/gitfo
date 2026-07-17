import { describe, expect, it } from "vitest";
import { formatJson, formatMultiRepoJson } from "../../src/output/json.js";
import { MultiRepoStats, RepoStats } from "../../src/types.js";

const repoStats: RepoStats = {
  name: "gitfo",
  path: "/tmp/gitfo",
  commits: [
    {
      hash: "abc1234",
      message: "feat: add json",
      author: "Test User",
      date: new Date("2026-01-01T12:00:00.000Z"),
      filesChanged: 2,
      linesAdded: 10,
      linesDeleted: 3,
    },
  ],
  totalCommits: 1,
  totalFilesChanged: 2,
  totalLinesAdded: 10,
  totalLinesDeleted: 3,
  netChange: 7,
};

describe("json output", () => {
  it("formats single repo stats as parseable JSON", () => {
    const parsed = JSON.parse(formatJson(repoStats));

    expect(parsed).toMatchObject({
      name: "gitfo",
      totalCommits: 1,
      commits: [
        {
          hash: "abc1234",
          date: "2026-01-01T12:00:00.000Z",
        },
      ],
    });
  });

  it("formats multi repo stats as parseable JSON", () => {
    const stats: MultiRepoStats = {
      repositories: [repoStats],
      totalRepositories: 1,
      totalCommits: 1,
      totalFilesChanged: 2,
      totalLinesAdded: 10,
      totalLinesDeleted: 3,
      netChange: 7,
    };

    const parsed = JSON.parse(formatMultiRepoJson(stats));

    expect(parsed).toMatchObject({
      totalRepositories: 1,
      repositories: [{ name: "gitfo" }],
    });
  });
});
