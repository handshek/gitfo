import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Changelog, HistoryContext } from "../../src/types.js";
import { commit, git, repository, runCli } from "../helpers/history.js";

let directory: string;
beforeEach(() => { directory = repository(); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

function context(...args: string[]): HistoryContext {
  return JSON.parse(runCli(directory, "context", ...args, "--format", "json"));
}

describe("history context command", () => {
  it("ranks shared frequencies, breaks ties by path, and caps evidence and companions", () => {
    const peers = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"];
    const hashes: string[] = [];
    for (let i = 0; i < 4; i++) hashes.push(commit(directory, `fix: coordinated ${i}`, Object.fromEntries(["target.ts", ...peers].map(path => [path, String(i)]))));
    commit(directory, "fix: target alone", { "target.ts": "alone" });
    const result = context("--files", "target.ts");
    expect(result.files[0].eligibleCommits).toBe(5);
    expect(result.files[0].companions.map(file => file.path)).toEqual(peers.slice(0, 5));
    expect(result.files[0].companions[0]).toMatchObject({ sharedCommits: 4, frequency: 0.8 });
    expect(result.files[0].companions[0].evidence.map(commit => commit.hash)).toEqual(hashes.slice(1).reverse());
    expect(result.history.excluded.roots).toBe(1);
    expect(runCli(directory, "context", "--files", "target.ts")).toContain("4/5 shared commits (80%)");
  });

  it("excludes broad changesets and merge envelopes, preserves branch changes, and reports sparse targets", () => {
    for (let i = 0; i < 3; i++) commit(directory, `fix: paired ${i}`, { "target.ts": String(i), "useful.ts": String(i) });
    for (let i = 0; i < 3; i++) commit(directory, `chore: bulk ${i}`, Object.fromEntries(["target.ts", ...Array.from({ length: 30 }, (_, n) => `noise-${n}.ts`)].map(path => [path, String(i)])));
    git(directory, "checkout", "-b", "feature");
    commit(directory, "fix: branch", { "sparse.ts": "sparse" });
    git(directory, "checkout", "main");
    git(directory, "merge", "--no-ff", "feature", "-m", "Merge feature");
    const result = context("--files", "target.ts", "sparse.ts", "unknown.ts");
    expect(result.history).toMatchObject({ eligibleCommits: 4, excluded: { merges: 1, roots: 1, largeChangesets: 3 } });
    expect(result.files.find(file => file.path === "target.ts")?.companions.map(file => file.path)).toEqual(["useful.ts"]);
    expect(result.files.find(file => file.path === "sparse.ts")?.companions).toEqual([]);
    expect(result.limitations.join("\n")).toContain('Sparse history for "sparse.ts": 1');
    expect(result.limitations.join("\n")).toContain('Sparse history for "unknown.ts": 0');
  });

  it("uses historical refs and anchors changelog context before the release", () => {
    for (let i = 0; i < 3; i++) commit(directory, `fix: earlier ${i}`, { "target.ts": String(i), "earlier.ts": String(i) });
    git(directory, "tag", "baseline");
    const baseline = git(directory, "rev-parse", "baseline");
    for (let i = 0; i < 3; i++) commit(directory, `feat: release ${i}`, { "target.ts": String(i), "release-only.ts": String(i) });
    const prior = context("--files", "target.ts", "--ref", "baseline");
    expect(prior.at).toEqual({ ref: "baseline", hash: baseline });
    expect(prior.files[0].companions.map(file => file.path)).toEqual(["earlier.ts"]);
    expect(context("--files", "target.ts").files[0].companions.map(file => file.path)).toEqual(["earlier.ts", "release-only.ts"]);
    const release: Changelog = JSON.parse(runCli(directory, "changelog", "--from", "baseline", "--to", "HEAD", "--with-context", "--format", "json"));
    for (const entry of release.entries) {
      expect(entry.context?.at).toEqual({ ref: "baseline", hash: baseline });
      expect(entry.context?.files.find(file => file.path === "target.ts")?.companions.map(file => file.path)).toEqual(["earlier.ts"]);
      expect(entry.context?.files.find(file => file.path === "release-only.ts")?.eligibleCommits).toBe(0);
    }
    expect(runCli(directory, "changelog", "--from", "baseline", "--to", "HEAD", "--with-context")).toContain("Historical context at baseline");
  });

  it("collects staged, unstaged, deleted, renamed and untracked paths without changing the worktree", () => {
    commit(directory, "files", { "staged.ts": "a", "unstaged.ts": "b", "deleted.ts": "c", "old.ts": "d", ".gitignore": "ignored.txt" });
    writeFileSync(join(directory, "staged.ts"), "staged");
    git(directory, "add", "staged.ts");
    writeFileSync(join(directory, "unstaged.ts"), "unstaged");
    rmSync(join(directory, "deleted.ts"));
    git(directory, "mv", "old.ts", "new.ts");
    writeFileSync(join(directory, "untracked\t[*]\n.txt"), "untracked");
    writeFileSync(join(directory, "ignored.txt"), "ignored");
    const before = git(directory, "status", "--porcelain=v1", "-z", "--untracked-files=all");
    const result = context("--working-tree");
    expect(result.source).toBe("working-tree");
    expect(result.files.map(file => file.path)).toEqual(["deleted.ts", "new.ts", "old.ts", "staged.ts", "unstaged.ts", "untracked\t[*]\n.txt"]);
    expect(git(directory, "status", "--porcelain=v1", "-z", "--untracked-files=all")).toBe(before);
  });

  it("handles literal filenames and paths from subdirectories, with no rename-chain inference", () => {
    const path = "src/a[*]\t\n.ts";
    for (let i = 0; i < 3; i++) commit(directory, `fix: literal ${i}`, { [path]: String(i), "companion.ts": String(i) });
    const result: HistoryContext = JSON.parse(runCli(join(directory, "src"), "context", "--files", "a[*]\t\n.ts", "--format", "json"));
    expect(result.files[0].path).toBe(path);
    expect(result.files[0].companions[0].path).toBe("companion.ts");
    git(directory, "mv", path, "renamed.ts");
    commit(directory, "Rename target");
    expect(context("--files", "renamed.ts").files[0].companions).toEqual([]);
  });

  it("handles clean worktrees and rejects ambiguous selections, escaping paths, or invalid refs", () => {
    expect(context("--working-tree").files).toEqual([]);
    expect(context("--working-tree").limitations.join("\n")).toContain("No changed paths");
    for (const args of [[], ["--files", "initial.txt", "--working-tree"], ["--files", "../outside"], ["--files", ".git/config"], ["--files", "a", "--ref", "missing"]]) {
      expect(() => context(...args)).toThrow();
    }
    expect(() => runCli(directory, "--author", "Other", "changelog", "--from", "start", "--to", "HEAD")).toThrow(/Activity options/);
    expect(() => runCli(dirname(directory), "context", "--files", "a")).toThrow(/Not in a Git worktree/);
  });

  it("limits the window to the latest 1000 eligible commits", () => {
    const initial = git(directory, "rev-parse", "HEAD");
    let data = "";
    for (let i = 0; i < 1005; i++) {
      const message = `fix: bulk ${i}`;
      const content = `${i}\n`;
      data += `commit refs/heads/main\ncommitter Test <test@example.com> ${1700000000 + i} +0000\ndata ${message.length}\n${message}\n${i === 0 ? `from ${initial}\n` : ""}M 100644 inline target.ts\ndata ${content.length}\n${content}M 100644 inline companion.ts\ndata ${content.length}\n${content}\n`;
      if (i % 200 === 0) {
        data += "commit refs/heads/main\ncommitter Test <test@example.com> 1701000000 +0000\ndata 4\nbulk\n";
        for (const path of ["target.ts", ...Array.from({ length: 31 }, (_, n) => `noise-${n}.ts`)]) {
          data += `M 100644 inline ${path}\ndata ${content.length}\n${content}`;
        }
        data += "\n";
      }
    }
    execFileSync("git", ["fast-import", "--quiet"], { cwd: directory, input: data, stdio: ["pipe", "ignore", "pipe"] });
    const result = context("--files", "target.ts");
    expect(result.history).toMatchObject({ eligibleCommits: 1000, examinedCommits: 1005, excluded: { largeChangesets: 5 }, windowLimitReached: true });
    expect(result.files[0].companions[0]).toMatchObject({ sharedCommits: 1000, frequency: 1 });
    expect(result.files[0].companions[0].evidence[0].subject).toBe("fix: bulk 1004");
  });

  it("reports shallow-history limitations", () => {
    commit(directory, "fix: shallow", { "target.ts": "target" });
    const clone = join(directory, "shallow-clone");
    git(directory, "clone", "--depth=1", `file://${directory}`, clone);
    const result: HistoryContext = JSON.parse(runCli(clone, "context", "--files", "target.ts", "--format", "json"));
    expect(result.history.shallow).toBe(true);
    expect(result.limitations.join("\n")).toContain("repository is shallow");
  });
});
