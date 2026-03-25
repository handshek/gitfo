import { readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import { isGitRepo } from "../utils/git.js";

const DEFAULT_MAX_DEPTH = 3;

export function findGitRepos(
  paths: string[],
  maxDepth: number = DEFAULT_MAX_DEPTH,
): string[] {
  const repos = new Set<string>();

  for (const inputPath of paths) {
    const absolutePath = resolve(inputPath);
    walkForRepos(absolutePath, 0, maxDepth, repos);
  }

  return Array.from(repos).sort((a, b) => a.localeCompare(b));
}

function walkForRepos(
  currentPath: string,
  depth: number,
  maxDepth: number,
  repos: Set<string>,
): void {
  let stats;

  try {
    stats = statSync(currentPath);
  } catch {
    return;
  }

  if (!stats.isDirectory()) {
    return;
  }

  if (isGitRepo(currentPath)) {
    repos.add(currentPath);
    return;
  }

  if (depth >= maxDepth) {
    return;
  }

  let entries: string[];

  try {
    entries = readdirSync(currentPath);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry === ".git" || entry === "node_modules") {
      continue;
    }

    walkForRepos(join(currentPath, entry), depth + 1, maxDepth, repos);
  }
}
