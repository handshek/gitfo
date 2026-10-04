import { isAbsolute, relative, resolve, sep } from "node:path";
import { GitHistory, changedFiles } from "./history.js";
import type { ContextOptions, FileContext, HistoryCommit, HistoryContext } from "../types.js";

const limits = { commits: 1000, filesPerCommit: 30, minSharedCommits: 3, companions: 5, evidence: 3 };

/** One history window is reused for every requested file and changelog entry. */
export async function historyContext(git: GitHistory, paths: string[], ref: string, source: HistoryContext["source"] = "files"): Promise<HistoryContext> {
  const hash = await git.resolve(ref);
  const [shallow, url] = await Promise.all([git.isShallow(), git.commitUrl()]);
  const excluded = { merges: 0, roots: 0, largeChangesets: 0 };
  const eligible: { commit: HistoryCommit; paths: string[] }[] = [];
  let examined = 0;
  let skip = 0;
  while (eligible.length < limits.commits) {
    const batch = await git.commits(hash, { limit: 256, skip, includeMerges: true });
    if (!batch.length) break;
    skip += batch.length;
    for (const commit of batch) {
      examined++;
      if (commit.parents.length > 1) { excluded.merges++; continue; }
      if (!commit.parents.length) { excluded.roots++; continue; }
      const files = changedFiles(commit);
      if (files.length > limits.filesPerCommit) { excluded.largeChangesets++; continue; }
      eligible.push({ commit, paths: files });
      if (eligible.length === limits.commits) break;
    }
    if (batch.length < 256) break;
  }
  const files = [...new Set(paths)].sort().map(path => {
    let count = 0;
    const pairs = new Map<string, { count: number; evidence: FileContext["companions"][number]["evidence"] }>();
    for (const record of eligible) {
      if (!record.paths.includes(path)) continue;
      count++;
      for (const companion of record.paths) {
        if (companion === path) continue;
        const pair = pairs.get(companion) ?? { count: 0, evidence: [] };
        pair.count++;
        if (pair.evidence.length < limits.evidence) pair.evidence.push({ hash: record.commit.hash, subject: record.commit.subject, ...(url ? { url: url(record.commit.hash) } : {}) });
        pairs.set(companion, pair);
      }
    }
    return {
      path, eligibleCommits: count,
      companions: [...pairs.entries()]
        .filter(([, pair]) => pair.count >= limits.minSharedCommits)
        .map(([companion, pair]) => ({ path: companion, sharedCommits: pair.count, frequency: pair.count / count, evidence: pair.evidence }))
        .sort((a, b) => b.frequency - a.frequency || b.sharedCommits - a.sharedCommits || comparePaths(a.path, b.path))
        .slice(0, limits.companions),
    };
  });
  return {
    schemaVersion: 1, kind: "context", at: { ref, hash }, source, files,
    history: { eligibleCommits: eligible.length, examinedCommits: examined, excluded, limits: { ...limits }, windowLimitReached: eligible.length === limits.commits, shallow },
    limitations: [
      "Co-change frequencies are historical observations, not probabilities of breakage or required edits.",
      "Merge commits, root snapshots, and changesets touching more than 30 paths are excluded. Rename chains are not followed.",
      ...(shallow ? ["This repository is shallow; missing history can suppress or distort suggestions."] : []),
      ...(eligible.length === limits.commits ? ["Only the latest 1000 eligible commits at this ref were considered."] : []),
      ...files.filter(file => file.eligibleCommits < limits.minSharedCommits).map(file => `Sparse history for ${JSON.stringify(file.path)}: ${file.eligibleCommits} eligible commits; no companion can meet the minimum of 3 shared commits.`),
      ...(!files.length ? ["No changed paths were selected; there are no companion suggestions."] : []),
    ],
  };
}

function comparePaths(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

export async function generateContext(directory: string, options: Pick<ContextOptions, "files" | "workingTree" | "ref">): Promise<HistoryContext> {
  if (Boolean(options.files?.length) === Boolean(options.workingTree)) throw new Error("Choose exactly one of --files <paths...> or --working-tree.");
  const git = await GitHistory.open(directory);
  const paths = options.workingTree ? await workingTreePaths(git) : options.files!.map(file => {
    const path = relative(git.root, resolve(directory, file));
    if (!path || path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path) || path === ".git" || path.startsWith(`.git${sep}`)) {
      throw new Error(`Expected a file path inside this worktree, not ${JSON.stringify(file)}.`);
    }
    return path.split(sep).join("/");
  });
  return historyContext(git, paths, options.ref, options.workingTree ? "working-tree" : "files");
}

async function workingTreePaths(git: GitHistory): Promise<string[]> {
  const tokens = (await git.run(["status", "--porcelain=v1", "-z", "--untracked-files=all"])).split("\0");
  const paths: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const record = tokens[i];
    paths.push(record.slice(3));
    if (/[RC]/.test(record.slice(0, 2))) paths.push(tokens[++i]);
  }
  return [...new Set(paths)].sort();
}
