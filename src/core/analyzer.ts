import simpleGit, { SimpleGit } from "simple-git";
import { basename } from "path";
import {
  RepoStats,
  CommitInfo,
  DateRange,
  CommitAnalysisFailure,
} from "../types.js";
import { formatDateForGit } from "../utils/date.js";

// Git's empty tree hash
const EMPTY_TREE_HASH = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

export async function analyzeRepository(
  path: string,
  dateRange: DateRange,
  author: string | null,
  includeMerges: boolean,
): Promise<RepoStats> {
  const git: SimpleGit = simpleGit(path);
  const repoName = basename(path);

  // Format dates as YYYY-MM-DD strings for git
  const sinceStr = formatDateForGit(dateRange.start);
  const untilStr = formatDateForGit(dateRange.end);

  const logOptions: any = {
    "--since": sinceStr,
    "--until": untilStr,
  };

  if (author) {
    logOptions["--author"] = author;
  }

  if (!includeMerges) {
    logOptions["--no-merges"] = true;
  }

  const log = await git.log(logOptions);

  const commits: CommitInfo[] = [];
  const analysisFailures: CommitAnalysisFailure[] = [];

  // Process each commit to get diff stats
  for (const commit of log.all) {
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
  const parentCommit = await git
    .raw(["rev-parse", `${commitHash}^`])
    .catch(() => null);

  if (parentCommit && parentCommit.trim()) {
    return git.diffSummary([`${commitHash}^`, commitHash]);
  }

  return git.diffSummary([EMPTY_TREE_HASH, commitHash]);
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
