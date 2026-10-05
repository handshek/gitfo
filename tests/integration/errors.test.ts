import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commit, git, repository } from "../helpers/history.js";

const cli = resolve("src/index.ts");
let directory: string;
beforeEach(() => { directory = repository(); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

function invoke(args: string[], cwd = directory) {
  return spawnSync("bun", [cli, ...args], { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
}

function expectJsonFailure(args: string[], code: string, cwd = directory) {
  const result = invoke(args, cwd);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr.trim().split("\n")).toHaveLength(1);
  const error = JSON.parse(result.stderr);
  expect(error).toEqual({ schemaVersion: 1, kind: "error", error: { code, message: expect.any(String) } });
  expect(error.error.message.length).toBeGreaterThan(0);
  expect(result.stderr).not.toContain(" at ");
  return error;
}

describe("JSON error contract", () => {
  it("reports invalid dates and conflicting date modes without changing success output", () => {
    const invalid = expectJsonFailure(["--format", "json", "--date", "not-a-date"], "INVALID_DATE_RANGE");
    expect(invalid.error.message).toContain("YYYY-MM-DD");
    expectJsonFailure(["--format=json", "--since", "2026-02-02", "--until", "2026-02-01"], "INVALID_DATE_RANGE");
    expectJsonFailure(["--format", "json", "--today", "--yesterday"], "INVALID_DATE_RANGE");
    const success = invoke(["--format", "json", "--since", "1970-01-01"]);
    expect(success.status).toBe(0);
    expect(success.stderr).toBe("");
    expect(JSON.parse(success.stdout)).toMatchObject({ totalCommits: 1 });
  });

  it("reports non-repository failures consistently for every command", () => {
    const outside = mkdtempSync(join(tmpdir(), "gitfo-errors-outside-"));
    try {
      for (const args of [["--format", "json"], ["changelog", "--from", "HEAD", "--to", "HEAD", "--format", "json"], ["context", "--files", "file.txt", "--format", "json"]]) {
        expectJsonFailure(args, "NOT_GIT_REPOSITORY", outside);
      }
    } finally { rmSync(outside, { recursive: true, force: true }); }
  });

  it("handles Commander errors before execution, including errors before the format flag", () => {
    for (const args of [
      ["--unknown", "--format", "json"],
      ["--format", "json", "--date"],
      ["changelog", "--to", "HEAD", "--format", "json"],
      ["changelog", "--from", "HEAD", "--to", "HEAD", "--unknown", "--format", "json"],
      ["context", "--format", "json"],
      ["context", "--files", "file.txt", "--working-tree", "--format", "json"],
      ["--author", "Test User", "changelog", "--from", "HEAD", "--to", "HEAD", "--format", "json"],
    ]) expectJsonFailure(args, "INVALID_ARGUMENTS");
  });

  it("gives stable codes for invalid refs, reversed ranges, and escaping paths", () => {
    commit(directory, "feat: change", { "file.txt": "changed" });
    expectJsonFailure(["changelog", "--from", "missing", "--to", "HEAD", "--format", "json"], "INVALID_REF");
    expectJsonFailure(["context", "--files", "file.txt", "--ref", "missing", "--format", "json"], "INVALID_REF");
    expectJsonFailure(["changelog", "--from", "HEAD", "--to", "start", "--format", "json"], "INVALID_COMMIT_RANGE");
    expectJsonFailure(["context", "--files", "../outside", "--format", "json"], "INVALID_PATH");
  });

  it("serializes unexpected Git failures while preserving partial scan results", () => {
    const empty = mkdtempSync(join(tmpdir(), "gitfo-errors-empty-"));
    try {
      git(empty, "init");
      expectJsonFailure(["--format=json"], "OPERATION_FAILED", empty);
      const scan = invoke(["--scan", directory, empty, "--since", "1970-01-01", "--format=json"]);
      expect(scan.status).toBe(0);
      expect(scan.stderr).toBe("");
      const result = JSON.parse(scan.stdout);
      expect(result.repositories).toHaveLength(1);
      expect(result.failedRepositories).toHaveLength(1);
    } finally { rmSync(empty, { recursive: true, force: true }); }
  });

  it("preserves human-readable diagnostics and successful help/version in JSON mode", () => {
    const human = invoke(["--date", "not-a-date"]);
    expect(human.status).toBe(1);
    expect(human.stderr).toMatch(/^Error: Invalid date/);
    expect(() => JSON.parse(human.stderr)).toThrow();
    for (const args of [["--format", "json", "--help"], ["--format", "json", "--version"], ["context", "--format", "json", "--help"]]) {
      const result = invoke(args);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.length).toBeGreaterThan(0);
    }
  });

  it("uses the final format option and does not mistake option values or literal arguments for JSON requests", () => {
    const markdown = invoke(["changelog", "--from", "missing", "--to", "HEAD", "--format", "json", "--format", "markdown"]);
    expect(markdown.stderr).toMatch(/^Error: Cannot resolve/);
    for (const args of [["--author", "--format=json", "--date", "bad"], ["--unknown", "--", "--format=json"]]) {
      const result = invoke(args);
      expect(result.status).toBe(1);
      expect(() => JSON.parse(result.stderr)).toThrow();
    }
  });
});
