import { execFileSync } from "child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isGitRepo } from "../../src/utils/git.js";

let tempDir: string;

function runGit(args: string[], cwd: string): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function createRepo(path: string): void {
  mkdirSync(path, { recursive: true });
  runGit(["init"], path);
  runGit(["config", "user.name", "Test User"], path);
  runGit(["config", "user.email", "test@example.com"], path);
  writeFileSync(join(path, "file.txt"), "hello\n");
  runGit(["add", "file.txt"], path);
  runGit(["commit", "-m", "feat: initial"], path);
}

describe("isGitRepo", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitfo-git-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("detects a normal git repository", () => {
    const repoPath = join(tempDir, "repo");
    createRepo(repoPath);

    expect(isGitRepo(repoPath)).toBe(true);
  });

  it("detects a worktree with a .git file", () => {
    const repoPath = join(tempDir, "repo");
    const worktreePath = join(tempDir, "worktree");
    createRepo(repoPath);
    runGit(["worktree", "add", worktreePath], repoPath);

    expect(isGitRepo(worktreePath)).toBe(true);
  });

  it("returns false for non-repositories and missing paths", () => {
    const plainPath = join(tempDir, "plain");
    mkdirSync(plainPath);

    expect(isGitRepo(plainPath)).toBe(false);
    expect(isGitRepo(join(tempDir, "missing"))).toBe(false);
  });
});
