import { MultiRepoStats, RepoAnalysisFailure, RepoStats } from "../types.js";

export function aggregateRepositories(
  repositories: RepoStats[],
  failedRepositories: RepoAnalysisFailure[] = [],
): MultiRepoStats {
  return {
    repositories,
    failedRepositories,
    totalRepositories: repositories.length,
    totalFailedRepositories: failedRepositories.length,
    totalCommits: repositories.reduce((sum, repo) => sum + repo.totalCommits, 0),
    totalFilesChanged: repositories.reduce(
      (sum, repo) => sum + repo.totalFilesChanged,
      0,
    ),
    totalLinesAdded: repositories.reduce(
      (sum, repo) => sum + repo.totalLinesAdded,
      0,
    ),
    totalLinesDeleted: repositories.reduce(
      (sum, repo) => sum + repo.totalLinesDeleted,
      0,
    ),
    netChange: repositories.reduce((sum, repo) => sum + repo.netChange, 0),
  };
}
