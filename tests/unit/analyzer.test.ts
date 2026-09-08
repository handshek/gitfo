import { execFileSync } from "child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DateRange } from "../../src/types.js";

let tempDir: string;

const dateRange: DateRange = {
  start: new Date("2026-01-01T00:00:00.000Z"),
  end: new Date("2026-12-31T23:59:59.999Z"),
};

function runGit(args: string[], cwd: string, env = process.env): void {
  execFileSync("git", args, { cwd, env, stdio: "ignore" });
}

function gitOutput(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function initRepo(path: string): void {
  mkdirSync(path, { recursive: true });
  runGit(["init"], path);
  runGit(["config", "user.name", "Test User"], path);
  runGit(["config", "user.email", "test@example.com"], path);
}

function commitFile(path: string, fileName: string, content: string): void {
  writeFileSync(join(path, fileName), content);
  runGit(["add", fileName], path);
  runGit(["commit", "-m", `feat: update ${fileName}`], path, {
    ...process.env,
    GIT_AUTHOR_DATE: "2026-02-01T10:00:00Z",
    GIT_COMMITTER_DATE: "2026-02-01T10:00:00Z",
  });
}

describe("analyzeRepository", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitfo-analyzer-test-"));
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("analyzes root and normal commits", async () => {
    const { analyzeRepository } = await import("../../src/core/analyzer.js");
    initRepo(tempDir);
    commitFile(tempDir, "one.txt", "one\n");
    commitFile(tempDir, "two.txt", "two\n");

    const stats = await analyzeRepository(tempDir, dateRange, null, false);

    expect(stats.totalCommits).toBe(2);
    expect(stats.totalFilesChanged).toBe(2);
    expect(stats.totalLinesAdded).toBe(2);
    expect(stats.analysisFailures).toEqual([]);
  });

  it("excludes merges by default and includes them when requested", async () => {
    const { analyzeRepository } = await import("../../src/core/analyzer.js");
    initRepo(tempDir);
    commitFile(tempDir, "base.txt", "base\n");
    const defaultBranch = gitOutput(["rev-parse", "--abbrev-ref", "HEAD"], tempDir);
    runGit(["checkout", "-b", "feature"], tempDir);
    commitFile(tempDir, "feature.txt", "feature\n");
    runGit(["checkout", defaultBranch], tempDir);
    commitFile(tempDir, "main.txt", "main\n");
    runGit(["merge", "--no-ff", "feature", "-m", "merge feature"], tempDir);

    const withoutMerges = await analyzeRepository(tempDir, dateRange, null, false);
    const withMerges = await analyzeRepository(tempDir, dateRange, null, true);

    expect(withoutMerges.totalCommits).toBe(3);
    expect(withMerges.totalCommits).toBe(4);
  });

  it("records commit analysis failures instead of skipping silently", async () => {
    vi.doMock("simple-git", () => ({
      default: () => ({
        log: vi.fn().mockResolvedValue({
          all: [
            {
              hash: "abcdef123456",
              message: "feat: mocked",
              author_name: "Test User",
              author_email: "test@example.com",
              date: "2026-02-01T10:00:00.000Z",
            },
          ],
        }),
        raw: vi.fn().mockResolvedValue("parent-hash"),
        diffSummary: vi.fn().mockRejectedValue(new Error("diff failed")),
      }),
    }));

    const { analyzeRepository } = await import("../../src/core/analyzer.js");
    const stats = await analyzeRepository(tempDir, dateRange, null, false);

    expect(stats.totalCommits).toBe(0);
    expect(stats.analysisFailures).toEqual([
      {
        hash: "abcdef1",
        message: "feat: mocked",
        reason: "diff failed",
      },
    ]);
  });
});
