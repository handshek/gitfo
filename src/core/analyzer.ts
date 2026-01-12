import simpleGit, { SimpleGit } from "simple-git";
import { basename } from "path";
import { RepoStats, CommitInfo, DateRange } from "../types.js";
import { formatDateForGit } from "../utils/date.js";

// Git's empty tree hash
const EMPTY_TREE_HASH = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

export async function analyzeRepository(
  path: string,
  dateRange: DateRange,
  author: string | null,
  includeMerges: boolean
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

  // Process each commit to get diff stats
  for (const commit of log.all) {
    try {
      let diffSummary;

      // Check if this is the root commit (no parent)
      // Try to get parent commit hash
      const parentCommit = await git
        .raw(["rev-parse", `${commit.hash}^`])
        .catch(() => null);

      if (parentCommit && parentCommit.trim()) {
        // Normal commit: compare with parent
        diffSummary = await git.diffSummary([`${commit.hash}^`, commit.hash]);
      } else {
        // Root commit: compare with empty tree (no parent exists)
        diffSummary = await git.diffSummary([EMPTY_TREE_HASH, commit.hash]);
      }

      const commitInfo: CommitInfo = {
        hash: commit.hash.substring(0, 7),
        message: commit.message || "",
        author: commit.author_email || commit.author_name || "unknown",
        date: new Date(commit.date),
        filesChanged: diffSummary.files.length,
        linesAdded: diffSummary.insertions,
        linesDeleted: diffSummary.deletions,
      };

      commits.push(commitInfo);
    } catch (error) {
      // If diffSummary fails, try alternative method for root commit
      try {
        const diffSummary = await git.diffSummary([
          EMPTY_TREE_HASH,
          commit.hash,
        ]);

        const commitInfo: CommitInfo = {
          hash: commit.hash.substring(0, 7),
          message: commit.message || "",
          author: commit.author_email || commit.author_name || "unknown",
          date: new Date(commit.date),
          filesChanged: diffSummary.files.length,
          linesAdded: diffSummary.insertions,
          linesDeleted: diffSummary.deletions,
        };

        commits.push(commitInfo);
      } catch (fallbackError) {
        // Skip commits that truly can't be analyzed
        continue;
      }
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
    totalCommits,
    totalFilesChanged,
    totalLinesAdded,
    totalLinesDeleted,
    netChange,
  };
}
