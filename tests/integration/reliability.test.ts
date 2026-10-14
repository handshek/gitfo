import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepoStats } from "../../src/types.js";

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

function repository(name: string): string {
  const repo = join(directory, name);
  mkdirSync(repo, { recursive: true });
  git(repo, "init");
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
  it("reports a missing shallow parent without counting the entire snapshot", () => {
    const source = repository("source");
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
