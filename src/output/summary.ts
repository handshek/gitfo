import { MultiRepoStats, RepoStats } from "../types.js";

export function formatSummary(stats: RepoStats): string {
  const netPrefix = stats.netChange >= 0 ? "+" : "";
  const warning =
    stats.analysisFailures.length > 0
      ? ` | Warnings: ${stats.analysisFailures.length} commits failed`
      : "";
  return `Commits: ${stats.totalCommits} | Files: ${stats.totalFilesChanged} | +${stats.totalLinesAdded} | -${stats.totalLinesDeleted} | Net: ${netPrefix}${stats.netChange}${warning}`;
}

export function formatMultiRepoSummary(stats: MultiRepoStats): string {
  const netPrefix = stats.netChange >= 0 ? "+" : "";
  const warning =
    stats.failedRepositories.length > 0
      ? ` | Warnings: ${stats.failedRepositories.length} repos failed`
      : "";
  return `Repos: ${stats.totalRepositories} | Commits: ${stats.totalCommits} | Files: ${stats.totalFilesChanged} | +${stats.totalLinesAdded} | -${stats.totalLinesDeleted} | Net: ${netPrefix}${stats.netChange}${warning}`;
}
