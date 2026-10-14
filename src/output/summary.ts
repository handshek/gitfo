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
  const warnings: string[] = [];
  if (stats.failedRepositories.length > 0) {
    warnings.push(`${stats.failedRepositories.length} repos failed`);
  }
  const failedCommits = stats.repositories.reduce(
    (sum, repo) => sum + repo.analysisFailures.length,
    0,
  );
  if (failedCommits > 0) {
    warnings.push(`${failedCommits} commits failed`);
  }
  const warning = warnings.length > 0 ? ` | Warnings: ${warnings.join(", ")}` : "";
  return `Repos: ${stats.totalRepositories} | Commits: ${stats.totalCommits} | Files: ${stats.totalFilesChanged} | +${stats.totalLinesAdded} | -${stats.totalLinesDeleted} | Net: ${netPrefix}${stats.netChange}${warning}`;
}
