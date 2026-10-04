import { GitHistory, changedFiles } from "./history.js";
import type { Changelog, ChangelogEntry, HistoryCommit } from "../types.js";

export async function generateChangelog(directory: string, from: string, to: string): Promise<Changelog> {
  const git = await GitHistory.open(directory);
  const endpoints = await git.range(from, to);
  const [commits, url, shallow] = await Promise.all([
    git.commits(`${endpoints.from}..${endpoints.to}`), git.commitUrl(), git.isShallow(),
  ]);
  return {
    schemaVersion: 1,
    kind: "changelog",
    range: { from: { ref: from, hash: endpoints.from }, to: { ref: to, hash: endpoints.to } },
    entries: commits.map(commit => categorize(commit, url)),
    changedFiles: [...new Set(commits.flatMap(changedFiles))].sort(),
    limitations: ["Entries describe authored commits, not verified deployments or user benefits.",
      ...(shallow ? ["This repository is shallow; earlier history may be unavailable."] : [])],
  };
}

function categorize(commit: HistoryCommit, url?: (hash: string) => string): ChangelogEntry {
  const match = commit.subject.match(/^([a-zA-Z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/);
  const breaking = Boolean(match?.[3]) || /^BREAKING(?: CHANGE|-CHANGE):\s*\S/m.test(commit.body);
  const type = match?.[1]?.toLowerCase();
  const category = breaking ? "breaking" : type === "feat" ? "features" : type === "fix" ? "fixes" : "other";
  return {
    category, description: match?.[4] ?? commit.subject,
    ...(match?.[2] ? { scope: match[2] } : {}),
    breaking, commits: [{ ...commit, ...(url ? { url: url(commit.hash) } : {}) }],
  };
}
