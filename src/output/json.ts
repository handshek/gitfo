import { MultiRepoStats, RepoStats } from "../types.js";

export function formatJson(stats: RepoStats): string {
  return JSON.stringify(stats, null, 2);
}

export function formatMultiRepoJson(stats: MultiRepoStats): string {
  return JSON.stringify(stats, null, 2);
}
