import { GitHistory, changedFiles } from "./history.js";
import type { Changelog, ChangelogEntry, HistoryCommit } from "../types.js";
import { historyContext } from "./context.js";

export async function generateChangelog(directory: string, from: string, to: string, withContext = false): Promise<Changelog> {
  const git = await GitHistory.open(directory);
  const endpoints = await git.range(from, to);
  const [commits, url, shallow] = await Promise.all([
    git.commits(`${endpoints.from}..${endpoints.to}`), git.commitUrl(), git.isShallow(),
  ]);
  const entries = commits.map(commit => categorize(commit, url));
  const paths = [...new Set(commits.flatMap(changedFiles))].sort();
  if (withContext && entries.length) {
    const context = await historyContext(git, paths, endpoints.from);
    context.at.ref = from;
    for (const entry of entries) {
      const touched = new Set(entry.commits.flatMap(changedFiles));
      entry.context = { ...context, files: context.files.filter(file => touched.has(file.path)),
        limitations: context.limitations.filter(note => !note.startsWith("Sparse history for ")) };
      for (const file of entry.context.files.filter(file => file.eligibleCommits < 3)) {
        entry.context.limitations.push(`Sparse history for ${JSON.stringify(file.path)}: ${file.eligibleCommits} eligible commits.`);
      }
    }
  }
  return {
    schemaVersion: 1,
    kind: "changelog",
    range: { from: { ref: from, hash: endpoints.from }, to: { ref: to, hash: endpoints.to } },
    entries,
    changedFiles: paths,
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
