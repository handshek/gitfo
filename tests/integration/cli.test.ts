import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFileSync } from "child_process";
import { format } from "date-fns";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const packageVersion = JSON.parse(
  readFileSync(join(projectRoot, "package.json"), "utf8"),
).version as string;
const cliPath = join(projectRoot, "src/index.ts");
const today = format(new Date(), "yyyy-MM-dd");
const commitDate = new Date(Date.now() - 60 * 60 * 1000)
  .toISOString()
  .replace(/\.\d{3}Z$/, ".000Z");

let tempDir: string;

function runGit(args: string[], cwd: string): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function runCli(args: string[], cwd = tempDir): string {
  return execFileSync("bun", [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
  });
}

function expectCliFailure(args: string[], cwd = tempDir): string {
  try {
    runCli(args, cwd);
    throw new Error("Expected CLI command to fail.");
  } catch (error) {
    const failure = error as { stderr?: Buffer; message: string };
    return failure.stderr?.toString() ?? failure.message;
  }
}

function createRepo(name = "repo"): string {
  const repoPath = join(tempDir, name);
  mkdirSync(repoPath, { recursive: true });
  runGit(["init"], repoPath);
  runGit(["config", "user.name", "Test User"], repoPath);
  runGit(["config", "user.email", "test@example.com"], repoPath);
  writeFileSync(join(repoPath, "file.txt"), "hello\n");
  runGit(["add", "file.txt"], repoPath);
  execFileSync("git", ["commit", "-m", "feat: initial"], {
    cwd: repoPath,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: commitDate,
      GIT_COMMITTER_DATE: commitDate,
    },
  });
  return repoPath;
}

describe("gitfo CLI", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitfo-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("prints help", () => {
    const output = runCli(["--help"], projectRoot);

    expect(output).toContain("Usage:");
    expect(output).toContain("--since <date>");
    expect(output).toContain("--this-week");
  });

  it("prints version", () => {
    expect(runCli(["--version"], projectRoot).trim()).toBe(packageVersion);
  });

  it("builds a runnable dist CLI with a shebang", () => {
    execFileSync("bun", ["run", "build"], { cwd: projectRoot, stdio: "ignore" });

    const distPath = join(projectRoot, "dist/index.js");
    expect(readFileSync(distPath, "utf8")).toMatch(/^#!\/usr\/bin\/env node/);
    expect(
      execFileSync("node", [distPath, "--version"], {
        cwd: projectRoot,
        encoding: "utf8",
      }).trim(),
    ).toBe(packageVersion);
  });

  it("rejects invalid formats", () => {
    const stderr = expectCliFailure(["--format", "xml"], projectRoot);

    expect(stderr).toContain("Allowed choices are table, json, summary");
  });

  it("emits parseable JSON for the current repository", () => {
    const repoPath = createRepo();
    const output = runCli(
      ["--format", "json", "--since", today, "--until", today],
      repoPath,
    );
    const parsed = JSON.parse(output);

    expect(parsed).toMatchObject({
      name: "repo",
      totalCommits: 1,
      totalFilesChanged: 1,
      totalLinesAdded: 1,
    });
    expect(parsed.commits[0]).toMatchObject({
      message: "feat: initial",
      date: commitDate,
    });
  });

  it("emits parseable JSON for scan mode", () => {
    createRepo("one");
    createRepo("two");

    const output = runCli(
      [
        "--scan",
        tempDir,
        "--format",
        "json",
        "--since",
        today,
        "--author",
        "Test User",
      ],
      projectRoot,
    );
    const parsed = JSON.parse(output);

    expect(parsed.totalRepositories).toBe(2);
    expect(parsed.totalCommits).toBe(2);
    expect(parsed.repositories.map((repo: { name: string }) => repo.name)).toEqual([
      "one",
      "two",
    ]);
  });

  it("supports summary output and representative date flags", () => {
    const repoPath = createRepo();
    const output = runCli(["--format", "summary", "--this-week"], repoPath);

    expect(output).toContain("Commits: 1");
  });

  it("expands single-repo table output in verbose mode", () => {
    const repoPath = createRepo();
    const output = runCli(["--verbose", "--since", today], repoPath);

    expect(output).toContain("Commits:");
    expect(output).toContain("Test User | files: 1");
    expect(output).toContain("feat: initial");
  });

  it("expands scan table output in verbose mode", () => {
    createRepo("one");
    const output = runCli(
      ["--scan", tempDir, "--verbose", "--since", today, "--author", "Test User"],
      projectRoot,
    );

    expect(output).toContain("one commits:");
    expect(output).toContain("Test User | files: 1");
  });

  it("runs bare gitfo against today instead of showing help", () => {
    const repoPath = createRepo();
    const output = runCli([], repoPath);

    expect(output).toContain("Git Activity for");
    expect(output).not.toContain("Usage:");
  });
});
