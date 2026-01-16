import { RepoStats } from "../types.js";

export function formatSummary(stats: RepoStats): string {
  const netPrefix = stats.netChange >= 0 ? "+" : "";
  return `Commits: ${stats.totalCommits} | Files: ${stats.totalFilesChanged} | +${stats.totalLinesAdded} | -${stats.totalLinesDeleted} | Net: ${netPrefix}${stats.netChange}`;
}
