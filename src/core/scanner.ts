import { execFileSync } from "child_process";
import { readFileSync, readdirSync, statSync } from "fs";
import { basename, relative, resolve, join } from "path";
import { isGitRepo } from "../utils/git.js";

const DEFAULT_MAX_DEPTH = 3;
const ALWAYS_IGNORED = new Set([".git", "node_modules"]);

interface WalkContext {
  fallbackIgnoreRules: FallbackIgnoreRule[];
  gitIgnoreRoot: string | null;
}

interface FallbackIgnoreRule {
  basePath: string;
  pattern: string;
}

export function findGitRepos(
  paths: string[],
  maxDepth: number = DEFAULT_MAX_DEPTH,
): string[] {
  const repos = new Set<string>();

  for (const inputPath of paths) {
    const absolutePath = resolve(inputPath);
    walkForRepos(absolutePath, 0, maxDepth, repos, {
      fallbackIgnoreRules: [],
      gitIgnoreRoot: findGitIgnoreRoot(absolutePath),
    });
  }

  return Array.from(repos).sort((a, b) => a.localeCompare(b));
}

function walkForRepos(
  currentPath: string,
  depth: number,
  maxDepth: number,
  repos: Set<string>,
  context: WalkContext,
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

  if (shouldIgnore(currentPath, context)) {
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

  const nextContext = {
    ...context,
    fallbackIgnoreRules: [
      ...context.fallbackIgnoreRules,
      ...readFallbackIgnoreRules(currentPath),
    ],
  };

  for (const entry of entries) {
    if (ALWAYS_IGNORED.has(entry)) {
      continue;
    }

    walkForRepos(
      join(currentPath, entry),
      depth + 1,
      maxDepth,
      repos,
      nextContext,
    );
  }
}

function shouldIgnore(path: string, context: WalkContext): boolean {
  if (ALWAYS_IGNORED.has(basename(path))) {
    return true;
  }

  if (context.gitIgnoreRoot && isIgnoredByGit(context.gitIgnoreRoot, path)) {
    return true;
  }

  return isIgnoredByFallbackRules(path, context.fallbackIgnoreRules);
}

function findGitIgnoreRoot(path: string): string | null {
  try {
    const output = execFileSync("git", ["-C", path, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return output.trim() || null;
  } catch {
    return null;
  }
}

function isIgnoredByGit(root: string, path: string): boolean {
  const pathFromRoot = relative(root, path);

  if (pathFromRoot.startsWith("..")) {
    return false;
  }

  try {
    execFileSync("git", ["-C", root, "check-ignore", "-q", "--", pathFromRoot], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function readFallbackIgnoreRules(path: string): FallbackIgnoreRule[] {
  try {
    return readFileSync(join(path, ".gitignore"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"))
      .map((pattern) => ({ basePath: path, pattern }));
  } catch {
    return [];
  }
}

function isIgnoredByFallbackRules(
  path: string,
  rules: FallbackIgnoreRule[],
): boolean {
  const base = basename(path);

  return rules.some(({ basePath, pattern }) => {
    const pathFromRuleBase = relative(basePath, path).split("/").join("/");

    if (pathFromRuleBase.startsWith("..")) {
      return false;
    }

    const normalized = pattern.replace(/^\//, "").replace(/\/$/, "");

    if (!normalized || normalized.includes("*")) {
      return false;
    }

    if (normalized.includes("/")) {
      return (
        pathFromRuleBase === normalized ||
        pathFromRuleBase.startsWith(`${normalized}/`)
      );
    }

    return base === normalized || pathFromRuleBase.split("/").includes(normalized);
  });
}
