import { describe, expect, it } from "vitest";
import { formatMultiRepoSummary, formatSummary } from "../../src/output/summary.js";
import { formatMultiRepoTable, formatTable } from "../../src/output/table.js";
import { DateRange, MultiRepoStats, RepoStats } from "../../src/types.js";

const dateRange: DateRange = {
  start: new Date("2026-01-01T00:00:00.000Z"),
  end: new Date("2026-01-01T23:59:59.999Z"),
};

const repoStats: RepoStats = {
  name: "repo",
  path: "/tmp/repo",
  commits: [
    {
      hash: "abc1234",
      message: "feat: verbose details",
      author: "Test User",
      date: new Date("2026-01-01T12:00:00.000Z"),
      filesChanged: 2,
      linesAdded: 10,
      linesDeleted: 3,
    },
  ],
  analysisFailures: [
    { hash: "def5678", message: "broken commit", reason: "diff failed" },
  ],
  totalCommits: 1,
  totalFilesChanged: 2,
  totalLinesAdded: 10,
  totalLinesDeleted: 3,
  netChange: 7,
};

const multiRepoStats: MultiRepoStats = {
  repositories: [repoStats],
  failedRepositories: [{ path: "/tmp/broken", message: "not readable" }],
  totalRepositories: 1,
  totalFailedRepositories: 1,
  totalCommits: 1,
  totalFilesChanged: 2,
  totalLinesAdded: 10,
  totalLinesDeleted: 3,
  netChange: 7,
};

describe("output formatters", () => {
  it("includes commit analysis warnings in table and summary output", () => {
    expect(formatTable(repoStats, dateRange, null)).toContain(
      "Warning: 1 commit(s) could not be analyzed.",
    );
    expect(formatSummary(repoStats)).toContain("Warnings: 1 commits failed");
  });

  it("includes failed repo warnings in multi-repo output", () => {
    expect(formatMultiRepoTable(multiRepoStats, dateRange, null)).toContain(
      "Warning: 1 repo(s) could not be analyzed.",
    );
    expect(formatMultiRepoSummary(multiRepoStats)).toContain(
      "Warnings: 1 repos failed",
    );
  });

  it("expands commit details in verbose table output", () => {
    const output = formatTable(repoStats, dateRange, null, true);

    expect(output).toContain("Commits:");
    expect(output).toContain("Test User | files: 2");
    expect(output).toContain("feat: verbose details");
  });

  it("keeps non-verbose table output compact", () => {
    const output = formatTable(repoStats, dateRange, null, false);

    expect(output).toContain("Recent commits:");
    expect(output).not.toContain("Test User | files: 2");
  });
});
