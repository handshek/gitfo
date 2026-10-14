import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MultiRepoStats, RepoStats } from "../../src/types.js";

const cli = resolve("src/index.ts");
const fixtureEnv = {
  ...process.env,
  TZ: "UTC",
  NO_COLOR: "1",
  GIT_AUTHOR_DATE: "2026-02-02T12:00:00Z",
  GIT_COMMITTER_DATE: "2026-02-02T12:00:00Z",
};
let directory: string;

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
    cwd, env: fixtureEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function repository(name: string, objectFormat = "sha1"): string {
  const repo = join(directory, name);
  mkdirSync(repo, { recursive: true });
  git(repo, "init", ...(objectFormat === "sha1" ? [] : [`--object-format=${objectFormat}`]));
  git(repo, "config", "user.name", "Reliability Test");
  git(repo, "config", "user.email", "reliability@example.com");
  return repo;
}

function commit(repo: string, file: string, content: string): string {
  writeFileSync(join(repo, file), content);
  git(repo, "add", "--", file);
  git(repo, "commit", "-m", `Add ${file}`);
  return git(repo, "rev-parse", "HEAD");
}

function invoke(cwd: string, ...args: string[]) {
  return spawnSync("bun", [cli, "--date", "2026-02-02", "--author", "Reliability Test", ...args], {
    cwd, env: fixtureEnv, encoding: "utf8",
  });
}

beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "gitfo-reliability-")); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

describe("activity reliability", () => {
  it.each(["sha1", "sha256"])("reports a missing %s shallow parent without counting the entire snapshot", (objectFormat) => {
    const source = repository("source", objectFormat);
    commit(source, "base.txt", "base\n".repeat(100));
    const boundary = commit(source, "boundary.txt", "boundary\n");
    const tip = commit(source, "tip.txt", "tip\n");
    const shallow = join(directory, "shallow");
    git(directory, "clone", "--depth=2", pathToFileURL(source).href, shallow);

    const result = invoke(shallow, "--format", "json");
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const stats: RepoStats = JSON.parse(result.stdout);
    expect(stats).toMatchObject({ totalCommits: 1, totalFilesChanged: 1, totalLinesAdded: 1, totalLinesDeleted: 0 });
    expect(stats.commits.map((entry) => entry.hash)).toEqual([tip.slice(0, 7)]);
    expect(stats.analysisFailures).toEqual([
      { hash: boundary.slice(0, 7), message: "Add boundary.txt", reason: expect.any(String) },
    ]);
    expect(stats.analysisFailures[0].reason.length).toBeGreaterThan(0);
  });
});

describe("scan identity", () => {
  it.each(["explicit paths", "parent directory"])("counts one worktree once through %s", (mode) => {
    const repo = repository("repository with spaces ");
    const subdirectory = join(repo, "src");
    mkdirSync(subdirectory);
    commit(repo, "src/one.txt", "one\ntwo\n");
    const alias = join(directory, "alias");
    symlinkSync(repo, alias, "dir");
    const paths = mode === "explicit paths" ? [repo, subdirectory, alias] : [directory];

    const result = invoke(directory, "--scan", ...paths, "--format", "json");
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const stats: MultiRepoStats = JSON.parse(result.stdout);
    expect(stats).toMatchObject({ totalRepositories: 1, totalCommits: 1, totalFilesChanged: 1, totalLinesAdded: 2 });
    expect(stats.repositories.map((entry) => entry.path)).toEqual([realpathSync(repo)]);
    expect(stats.failedRepositories).toEqual([]);
  });

  it("keeps separate linked worktrees in the scan", () => {
    const repo = repository("repository");
    commit(repo, "one.txt", "one\n");
    const linked = join(directory, "linked");
    git(repo, "worktree", "add", "--detach", linked, "HEAD");

    const result = invoke(directory, "--scan", repo, linked, "--format", "json");
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const stats: MultiRepoStats = JSON.parse(result.stdout);
    expect(stats).toMatchObject({ totalRepositories: 2, totalCommits: 2, totalLinesAdded: 2 });
    expect(stats.repositories.map((entry) => entry.path).sort()).toEqual([realpathSync(repo), realpathSync(linked)].sort());
  });
});

describe("partial scan output", () => {
  it.each(["summary", "table"])("warns about failed commits in %s without verbose mode", (format) => {
    const healthy = repository("healthy");
    commit(healthy, "good.txt", "good\n");
    const broken = repository("broken");
    const failedHash = commit(broken, "unavailable.txt", "unavailable\n");
    const blob = git(broken, "rev-parse", "HEAD:unavailable.txt");
    rmSync(join(broken, ".git", "objects", blob.slice(0, 2), blob.slice(2)));
    const empty = repository("empty");

    const jsonResult = invoke(directory, "--scan", healthy, broken, empty, "--format", "json");
    expect(jsonResult.status).toBe(0);
    expect(jsonResult.stderr).toBe("");
    const stats: MultiRepoStats = JSON.parse(jsonResult.stdout);
    expect(stats).toMatchObject({ totalRepositories: 2, totalCommits: 1, totalLinesAdded: 1 });
    expect(stats.failedRepositories).toHaveLength(1);
    expect(stats.repositories.flatMap((repo) => repo.analysisFailures).map((failure) => failure.hash)).toEqual([failedHash.slice(0, 7)]);

    const result = invoke(directory, "--scan", healthy, broken, empty, "--format", format);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    if (format === "summary") {
      expect(result.stdout.trim()).toBe("Repos: 2 | Commits: 1 | Files: 1 | +1 | -0 | Net: +1 | Warnings: 1 repos failed, 1 commits failed");
    } else {
      expect(result.stdout).toContain("Warning: 1 repo(s) could not be analyzed.");
      expect(result.stdout).toContain("Warning: 1 commit(s) could not be analyzed.");
    }
  });
});
