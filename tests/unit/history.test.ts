import { renameSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateChangelog } from "../../src/core/changelog.js";
import { generateContext } from "../../src/core/context.js";
import { formatChangelog } from "../../src/output/changelog.js";
import { formatContext } from "../../src/output/context.js";
import { commit, git, repository } from "../helpers/history.js";

let directory: string;
beforeEach(() => { directory = repository(); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

describe("shared history analysis", () => {
  it("preserves repository directory names ending in whitespace", async () => {
    const renamed = `${directory} \n`;
    renameSync(directory, renamed);
    directory = renamed;
    const result = await generateContext(directory, { files: ["initial.txt"], ref: "HEAD", workingTree: false });
    expect(result.files[0].path).toBe("initial.txt");
  });
  it("accepts directory aliases and missing historical files without following file symlinks", async () => {
    const alias = join(directory, "directory-alias");
    symlinkSync(directory, alias, "dir");
    const result = await generateContext(alias, { files: [join(alias, "missing", "a.ts"), "initial.txt"], ref: "HEAD", workingTree: false });
    expect(result.files.map(file => file.path)).toEqual(["initial.txt", "missing/a.ts"]);
    symlinkSync("/outside-worktree", join(directory, "tracked-link"));
    const link = await generateContext(directory, { files: ["tracked-link"], ref: "HEAD", workingTree: false });
    expect(link.files[0].path).toBe("tracked-link");
  });
  it("returns authored release records and history anchored at the resolved starting ref", async () => {
    for (let i = 0; i < 3; i++) commit(directory, `fix: earlier ${i}`, { "a.ts": String(i), "b.ts": String(i) });
    git(directory, "tag", "before");
    git(directory, "remote", "add", "origin", "https://gitlab.com/team/group/project.git");
    const feature = commit(directory, "feat(core): export\n\nAuthored body", { "a.ts": "export" });
    commit(directory, "fix!: remove obsolete behavior", { "b.ts": "breaking" });
    commit(directory, "Unknown subject");
    const result = await generateChangelog(directory, "before", "HEAD", true);
    expect(result.entries.map(entry => entry.category)).toEqual(["other", "breaking", "features"]);
    expect(result.entries[2].commits[0]).toMatchObject({ hash: feature, body: "Authored body\n", url: `https://gitlab.com/team/group/project/-/commit/${feature}` });
    expect(result.entries[2].context?.files[0].companions[0]).toMatchObject({ path: "b.ts", sharedCommits: 3, frequency: 1 });
    expect(formatChangelog(result)).toContain("Historical context at before");
    expect(formatChangelog(await generateChangelog(directory, "HEAD", "HEAD"))).toContain("No non-merge commits");
  });

  it("reports filtering and sparse history while retaining only supported companions", async () => {
    for (let i = 0; i < 3; i++) commit(directory, `paired ${i}`, { "a.ts": String(i), "b.ts": String(i) });
    commit(directory, "bulk", Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`noise-${i}`, String(i)])));
    const result = await generateContext(directory, { files: ["a.ts", "unknown.ts"], ref: "HEAD", workingTree: false });
    expect(result.history).toMatchObject({ eligibleCommits: 3, excluded: { roots: 1, largeChangesets: 1 } });
    expect(result.files[0].companions[0]).toMatchObject({ path: "b.ts", sharedCommits: 3, frequency: 1 });
    expect(formatContext(result)).toContain("3/3 shared commits (100%)");
    expect(formatContext(result)).toContain("Sparse history");
    await expect(generateContext(directory, { files: ["a.ts"], workingTree: true, ref: "HEAD" })).rejects.toThrow("exactly one");
    await expect(generateChangelog(directory, "missing", "HEAD")).rejects.toThrow("Cannot resolve");
    await expect(generateChangelog(directory, "--all", "HEAD")).rejects.toThrow("Invalid commit ref");
    await expect(generateChangelog(directory, "HEAD", "start")).rejects.toThrow("ancestor");
  });

  it("handles shallow history and deliberately avoids unrecognized commit URLs", async () => {
    commit(directory, "feat: change", { "a.ts": "a" });
    const clone = join(directory, "shallow-clone");
    git(directory, "clone", "--depth=1", `file://${directory}`, clone);
    const result = await generateContext(clone, { files: ["a.ts"], ref: "HEAD", workingTree: false });
    expect(result.history.shallow).toBe(true);
    expect(result.limitations.join(" ")).toContain("repository is shallow");
    git(directory, "remote", "add", "origin", "https://unknown.example/project.git");
    expect((await generateChangelog(directory, "start", "HEAD")).entries[0].commits[0].url).toBeUndefined();
    git(directory, "remote", "set-url", "origin", "git@bitbucket.org:team/project.git");
    expect((await generateChangelog(directory, "start", "HEAD")).entries[0].commits[0].url).toContain("https://bitbucket.org/team/project/commits/");
  });
});
