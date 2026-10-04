import { rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commit, git, repository, runCli } from "../helpers/history.js";

let directory: string;
beforeEach(() => { directory = repository(); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

function changelog(...args: string[]) {
  return JSON.parse(runCli(directory, "changelog", "--from", "start", "--to", "HEAD", "--format", "json", ...args));
}

describe("changelog command", () => {
  it("includes all authors, preserves evidence, and categorizes authored messages", () => {
    const feature = commit(directory, "feat(api): export data\n\nAuthored details, without a marketing rewrite.", { "src/a.ts": "feature" });
    git(directory, "config", "user.name", "Other Author");
    commit(directory, "fix: preserve paths", { "src/a.ts": "fix" });
    commit(directory, "feat!: remove old format", { "src/a.ts": "breaking" });
    commit(directory, "refactor: simplify reader\n\nBREAKING CHANGE: exports changed", { "src/a.ts": "footer" });
    commit(directory, "An uncategorized authored subject");
    const result = changelog();
    expect(result.schemaVersion).toBe(1);
    expect(result.entries.map((entry: any) => entry.category)).toEqual(["other", "breaking", "breaking", "fixes", "features"]);
    expect(result.entries.at(-1)).toMatchObject({ description: "export data", scope: "api", commits: [{ hash: feature, author: { name: "Test User" }, body: "Authored details, without a marketing rewrite.\n" }] });
    expect(result.entries[1].commits[0].author.name).toBe("Other Author");
    expect(result.changedFiles).toEqual(["src/a.ts"]);
    expect(result.range.from.hash).toBe(git(directory, "rev-parse", "start"));
    expect(result.range.to.hash).toBe(git(directory, "rev-parse", "HEAD"));
  });

  it("accepts annotated tags, excludes the starting commit, and preserves an empty range", () => {
    git(directory, "tag", "-a", "release", "-m", "Annotated release");
    expect(JSON.parse(runCli(directory, "changelog", "--from", "start", "--to", "release", "--format", "json")).entries).toEqual([]);
    expect(runCli(directory, "changelog", "--from", "start", "--to", "release")).toContain("No non-merge commits");
    expect(() => runCli(directory, "changelog", "--to", "HEAD")).toThrow(/required option/);
  });

  it("retains branch changes but not merge envelopes, and treats squash commits normally", () => {
    git(directory, "checkout", "-b", "feature");
    const feature = commit(directory, "feat: branch work", { "branch.txt": "branch" });
    git(directory, "checkout", "main");
    git(directory, "merge", "--no-ff", "feature", "-m", "Merge feature");
    const squash = commit(directory, "feat: squash of another change\n\nOriginal explanation", { "squashed.txt": "squash" });
    expect(changelog().entries.map((entry: any) => entry.commits[0].hash)).toEqual([squash, feature]);
  });

  it("preserves NUL-delimited whitespace, newlines, and rename statuses", () => {
    const odd = "odd\tname\n[*].txt";
    commit(directory, "fix: handle unusual names", { [odd]: "file" });
    git(directory, "mv", odd, "renamed file.txt");
    commit(directory, "Rename the file");
    expect(changelog().entries[0].commits[0].files).toEqual([{ status: "R100", previousPath: odd, path: "renamed file.txt" }]);
    expect(changelog().changedFiles).toEqual([odd, "renamed file.txt"]);
  });

  it("derives links only for recognized remotes and renders safe Markdown", () => {
    const hash = commit(directory, "feat: <script>*literal*", { "a.txt": "a" });
    git(directory, "remote", "add", "origin", "git@github.com:example/project.git");
    expect(changelog().entries[0].commits[0].url).toBe(`https://github.com/example/project/commit/${hash}`);
    expect(runCli(directory, "changelog", "--from", "start", "--to", "HEAD")).toContain("\\<script\\>\\*literal\\*");
    git(directory, "remote", "set-url", "origin", "https://unknown.example/project.git");
    expect(changelog().entries[0].commits[0].url).toBeUndefined();
  });

  it("rejects missing, option-like, and unrelated refs without printing partial stdout", () => {
    commit(directory, "main work", { "main.txt": "main" });
    git(directory, "checkout", "-b", "diverged", "start");
    commit(directory, "other work", { "other.txt": "other" });
    for (const from of ["missing", "--all", "main"]) {
      try {
        runCli(directory, "changelog", "--from", from, "--to", "HEAD", "--format", "json");
        throw new Error("Expected a failure");
      } catch (error) {
        expect((error as { stdout: string }).stdout).toBe("");
        expect(String(error)).toMatch(/Cannot resolve|Invalid commit ref|ancestor/);
      }
    }
  });
});
