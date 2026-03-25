import { MultiRepoStats, RepoStats } from "../types.js";

export function formatSummary(stats: RepoStats): string {
  const netPrefix = stats.netChange >= 0 ? "+" : "";
  return `Commits: ${stats.totalCommits} | Files: ${stats.totalFilesChanged} | +${stats.totalLinesAdded} | -${stats.totalLinesDeleted} | Net: ${netPrefix}${stats.netChange}`;
}

export function formatMultiRepoSummary(stats: MultiRepoStats): string {
  const netPrefix = stats.netChange >= 0 ? "+" : "";
  return `Repos: ${stats.totalRepositories} | Commits: ${stats.totalCommits} | Files: ${stats.totalFilesChanged} | +${stats.totalLinesAdded} | -${stats.totalLinesDeleted} | Net: ${netPrefix}${stats.netChange}`;
}
