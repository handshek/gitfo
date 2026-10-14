import simpleGit, { SimpleGit } from "simple-git";
import { basename } from "path";
import { devNull } from "node:os";
import {
  RepoStats,
  CommitInfo,
  DateRange,
  CommitAnalysisFailure,
} from "../types.js";
import { formatDateForGit } from "../utils/date.js";

export async function analyzeRepository(
  path: string,
  dateRange: DateRange,
  author: string | null,
  includeMerges: boolean,
): Promise<RepoStats> {
  const git: SimpleGit = simpleGit(path);
  const repoName = basename(path);

  const untilStr = formatDateForGit(dateRange.end);
  const version = await git.version();
  const supportsDateFilter = version.major > 2 || (version.major === 2 && version.minor >= 37);
  const revision = supportsDateFilter ? undefined : await git.revparse(["HEAD"]);
  const pageSize = 1000;

  const logOptions = {
    format: {
      hash: "%H",
      date: "%aI",
      message: "%s",
      author_name: "%aN",
      author_email: "%aE",
      committedAt: "%ct",
    },
    "--until": untilStr,
    ...(supportsDateFilter ? { "--since-as-filter": formatDateForGit(dateRange.start) } : {}),
    ...(author ? { "--author": author } : {}),
    ...(!includeMerges ? { "--no-merges": null } : {}),
  };

  const commits: CommitInfo[] = [];
  const analysisFailures: CommitAnalysisFailure[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const log = await git.log({
      ...logOptions,
      ...(revision ? { [revision]: null, maxCount: pageSize, "--skip": offset } : {}),
    });
    for (const commit of log.all) {
      // Older Git needs local filtering because --since can hide newer ancestors.
      if (Number(commit.committedAt) * 1000 < dateRange.start.getTime()) continue;
      try {
        commits.push(await analyzeCommit(git, commit));
      } catch (error) {
        analysisFailures.push({
          hash: commit.hash.substring(0, 7),
          message: commit.message || "",
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (supportsDateFilter || log.all.length < pageSize) break;
  }

  // Aggregate stats
  const totalCommits = commits.length;
  const totalFilesChanged = commits.reduce((sum, c) => sum + c.filesChanged, 0);
  const totalLinesAdded = commits.reduce((sum, c) => sum + c.linesAdded, 0);
  const totalLinesDeleted = commits.reduce((sum, c) => sum + c.linesDeleted, 0);
  const netChange = totalLinesAdded - totalLinesDeleted;

  return {
    name: repoName,
    path,
    commits,
    analysisFailures,
    totalCommits,
    totalFilesChanged,
    totalLinesAdded,
    totalLinesDeleted,
    netChange,
  };
}

async function analyzeCommit(git: SimpleGit, commit: any): Promise<CommitInfo> {
  const diffSummary = await getCommitDiffSummary(git, commit.hash);
  return toCommitInfo(commit, diffSummary);
}

async function getCommitDiffSummary(
  git: SimpleGit,
  commitHash: string,
): Promise<any> {
  const commitObject = await git.raw(["cat-file", "commit", commitHash]);
  const parent = commitObject
    .split("\n\n", 1)[0]
    .split("\n")
    .find((line) => line.startsWith("parent "))
    ?.slice(7);

  const base = parent ?? (await git.raw(["hash-object", "-t", "tree", devNull])).trim();
  return git.diffSummary([base, commitHash]);
}

function toCommitInfo(commit: any, diffSummary: any): CommitInfo {
  return {
    hash: commit.hash.substring(0, 7),
    message: commit.message || "",
    author: commit.author_name || commit.author_email || "unknown",
    date: new Date(commit.date),
    filesChanged: diffSummary.files.length,
    linesAdded: diffSummary.insertions,
    linesDeleted: diffSummary.deletions,
  };
}
