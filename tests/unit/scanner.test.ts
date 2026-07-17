import { execFileSync } from "child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findGitRepos } from "../../src/core/scanner.js";

let tempDir: string;

function runGit(args: string[], cwd: string): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function createRepo(path: string): void {
  mkdirSync(path, { recursive: true });
  runGit(["init"], path);
}

describe("findGitRepos", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitfo-scanner-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns sorted unique repository paths", () => {
    const bRepo = join(tempDir, "b-repo");
    const aRepo = join(tempDir, "a-repo");
    createRepo(bRepo);
    createRepo(aRepo);

    expect(findGitRepos([tempDir, aRepo])).toEqual([aRepo, bRepo]);
  });

  it("skips repos inside fallback .gitignore patterns", () => {
    writeFileSync(join(tempDir, ".gitignore"), "ignored/\n");
    const visibleRepo = join(tempDir, "visible");
    const ignoredRepo = join(tempDir, "ignored", "repo");
    createRepo(visibleRepo);
    createRepo(ignoredRepo);

    expect(findGitRepos([tempDir])).toEqual([visibleRepo]);
  });

  it("skips node_modules while scanning", () => {
    const visibleRepo = join(tempDir, "visible");
    const dependencyRepo = join(tempDir, "node_modules", "dependency");
    createRepo(visibleRepo);
    createRepo(dependencyRepo);

    expect(findGitRepos([tempDir])).toEqual([visibleRepo]);
  });

  it("returns an empty list for missing or unreadable paths", () => {
    expect(findGitRepos([join(tempDir, "missing")])).toEqual([]);
  });

  it("stops traversal once a repo root is found", () => {
    const outerRepo = join(tempDir, "outer");
    const nestedRepo = join(outerRepo, "nested");
    createRepo(outerRepo);
    createRepo(nestedRepo);

    expect(findGitRepos([outerRepo])).toEqual([outerRepo]);
  });
});
