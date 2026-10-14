import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const cli = resolve("src/index.ts");
const fixtureEnv = { ...process.env, TZ: "UTC", NO_COLOR: "1" };
let directory: string;

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
    cwd, env: fixtureEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function repository(name = "repo", objectFormat = "sha1"): string {
  const repo = join(directory, name);
  mkdirSync(repo);
  git(repo, "init", ...(objectFormat === "sha1" ? [] : [`--object-format=${objectFormat}`]));
  git(repo, "config", "user.name", "Reliability Test");
  git(repo, "config", "user.email", "reliability@example.com");
  return repo;
}

function commit(repo: string, file: string, date = "2026-02-02T12:00:00Z", authorDate = date): string {
  writeFileSync(join(repo, file), "one\ntwo\n");
  git(repo, "add", "--", file);
  execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-m", `Add ${file}`], {
    cwd: repo, env: { ...fixtureEnv, GIT_AUTHOR_DATE: authorDate, GIT_COMMITTER_DATE: date }, stdio: "ignore",
  });
  return git(repo, "rev-parse", "HEAD");
}

function invoke(cwd: string, ...args: string[]) {
  return spawnSync("bun", [cli, ...args], { cwd, env: fixtureEnv, encoding: "utf8" });
}

beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "gitfo-followup-")); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

describe("strict CLI inputs", () => {
  it.each([
    ["typo", "--format", "json"],
    ["--format", "json", "--", "extra"],
    ["context", "--working-tree", "extra", "--format", "json"],
    ["changelog", "--from", "HEAD", "--to", "HEAD", "extra", "--format", "json"],
  ])("rejects unexpected positional arguments: %j", (...args) => {
    const repo = repository();
    commit(repo, "initial.txt");
    const result = invoke(repo, ...args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toMatchObject({ error: { code: "INVALID_ARGUMENTS" } });
  });

  it.each(["--date", "--since", "--until"])("rejects an empty %s value", (option) => {
    const repo = repository();
    commit(repo, "initial.txt");
    const result = invoke(repo, option, "", "--format", "json");
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toMatchObject({ error: { code: "INVALID_DATE_RANGE" } });
  });

  it.each([
    ["--since", "", "--until", "2026-02-02"],
    ["--since", "2026-02-02", "--until", ""],
    ["--date", "", "--today"],
  ])("rejects empty date values combined with other bounds: %j", (...args) => {
    const result = invoke(directory, ...args, "--format", "json");
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toMatchObject({ error: { code: "INVALID_DATE_RANGE" } });
  });

  it("accepts multiple scan and context file values", () => {
    const one = repository("one");
    const two = repository("two");
    commit(one, "first.txt");
    commit(one, "second.txt");
    commit(two, "third.txt");
    const scanned = invoke(directory, "--scan", one, two, "--date", "2026-02-02", "--author", "Reliability Test", "--format", "json");
    expect(scanned.status).toBe(0);
    expect(scanned.stderr).toBe("");
    expect(JSON.parse(scanned.stdout)).toMatchObject({ totalRepositories: 2, totalCommits: 3 });
    const context = invoke(one, "context", "--files", "first.txt", "second.txt", "--format", "json");
    expect(context.status).toBe(0);
    expect(context.stderr).toBe("");
    expect(JSON.parse(context.stdout).files.map((file: { path: string }) => file.path)).toEqual(["first.txt", "second.txt"]);
  });
});

describe("complete activity statistics", () => {
  it("finds in-range ancestors behind backdated descendants using committer dates", () => {
    const repo = repository();
    commit(repo, "outside.txt", "2026-01-31T12:00:00Z");
    const included = commit(repo, "included.txt", "2026-02-02T00:00:00Z", "2026-01-30T12:00:00Z");
    const end = commit(repo, "end.txt", "2026-02-02T23:59:59Z");
    commit(repo, "future.txt", "2026-02-03T00:00:00Z");
    git(repo, "config", "user.name", "Other Author");
    commit(repo, "other-author.txt");
    git(repo, "config", "user.name", "Reliability Test");
    commit(repo, "backdated.txt", "2026-02-01T12:00:00Z");
    const result = invoke(repo, "--date", "2026-02-02", "--author", "Reliability Test", "--format", "json");
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const stats = JSON.parse(result.stdout);
    expect(stats).toMatchObject({ totalCommits: 2, totalFilesChanged: 2, totalLinesAdded: 4, analysisFailures: [] });
    expect(stats.commits.map((entry: { hash: string }) => entry.hash)).toEqual([end.slice(0, 7), included.slice(0, 7)]);
    expect(stats.commits[1].date).toBe("2026-01-30T12:00:00.000Z");
  });

  it.each(["sha1", "sha256"])("counts a %s root and child without writing repository objects", (objectFormat) => {
    const repo = repository(objectFormat, objectFormat);
    commit(repo, "root.txt");
    commit(repo, "child.txt");
    const before = git(repo, "count-objects", "-v");
    const result = invoke(repo, "--date", "2026-02-02", "--author", "Reliability Test", "--format", "json");
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({ totalCommits: 2, totalFilesChanged: 2, totalLinesAdded: 4, totalLinesDeleted: 0, analysisFailures: [] });
    expect(git(repo, "count-objects", "-v")).toBe(before);
  });
});
