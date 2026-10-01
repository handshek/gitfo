#!/usr/bin/env node
import { parseCLI } from "./cli.js";
import { parseDateRange } from "./utils/date.js";
import { getGitUserName, getGitUserEmail, isGitRepo } from "./utils/git.js";
import { analyzeRepository } from "./core/analyzer.js";
import { formatTable, formatMultiRepoTable } from "./output/table.js";
import { formatSummary, formatMultiRepoSummary } from "./output/summary.js";
import { formatJson, formatMultiRepoJson } from "./output/json.js";
import { createLoader } from "./utils/loader.js";
import { findGitRepos } from "./core/scanner.js";
import { runInParallel } from "./utils/parallel.js";
import { aggregateRepositories } from "./core/aggregator.js";
import { cwd } from "process";
import { RepoAnalysisFailure, RepoStats } from "./types.js";

type RepositoryAnalysisResult =
  | { ok: true; stats: RepoStats }
  | { ok: false; failure: RepoAnalysisFailure };

// Parse CLI - commander will handle --help and --version automatically
const options = parseCLI();

// Main execution
(async () => {
  try {
    // Parse date range
    const dateRange = parseDateRange(options);

    // Get author
    const author =
      options.author ||
      (await getGitUserName()) ||
      (await getGitUserEmail()) ||
      null;

    // Check if we're in a git repo
    const currentDir = cwd();
    if (!options.scan) {
      const format = options.format ?? "table";

      if (!isGitRepo(currentDir)) {
        console.error("Error: Not in a git repository.");
        console.error(
          "Run this command in a git repo, or use --scan to scan multiple repos.",
        );
        process.exit(1);
      }

      // Analyze current repository with loading animation
      const loader = createLoader("Analyzing commits...", "diff");
      if (format === "table") {
        loader.start();
      }

      try {
        const stats = await analyzeRepository(
          currentDir,
          dateRange,
          author,
          options.includeMerges ?? false,
        );
        if (format === "table") {
          loader.stop();
        }

        // Output formatted results based on format option
        let output: string;

        switch (format) {
          case "summary":
            output = formatSummary(stats);
            break;
          case "json":
            output = formatJson(stats);
            break;
          case "table":
          default:
            output = formatTable(stats, dateRange, author, options.verbose);
        }

        console.log(output);
      } catch (err) {
        if (format === "table") {
          loader.stop("✗ Failed to analyze repository");
        }
        throw err;
      }
    } else {
      const format = options.format ?? "table";
      const loader = createLoader("Scanning repositories...", "hash");
      if (format === "table") {
        loader.start();
      }

      try {
        const repoPaths = findGitRepos(options.scan);
        const results = await runInParallel(repoPaths, async (repoPath) =>
          analyzeRepositorySafely(
            repoPath,
            dateRange,
            author,
            options.includeMerges ?? false,
          ),
        );
        const repositories = results
          .filter((result): result is { ok: true; stats: RepoStats } => result.ok)
          .map((result) => result.stats);
        const failedRepositories = results
          .filter(
            (result): result is { ok: false; failure: RepoAnalysisFailure } =>
              !result.ok,
          )
          .map((result) => result.failure);
        const aggregated = aggregateRepositories(repositories, failedRepositories);
        if (format === "table") {
          loader.stop();
        }

        let output: string;

        switch (format) {
          case "summary":
            output = formatMultiRepoSummary(aggregated);
            break;
          case "json":
            output = formatMultiRepoJson(aggregated);
            break;
          case "table":
          default:
            output = formatMultiRepoTable(
              aggregated,
              dateRange,
              author,
              options.verbose,
            );
        }

        console.log(output);
      } catch (err) {
        if (format === "table") {
          loader.stop("✗ Failed to scan repositories");
        }
        throw err;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
})();

async function analyzeRepositorySafely(
  repoPath: string,
  dateRange: ReturnType<typeof parseDateRange>,
  author: string | null,
  includeMerges: boolean,
): Promise<RepositoryAnalysisResult> {
  try {
    return {
      ok: true,
      stats: await analyzeRepository(repoPath, dateRange, author, includeMerges),
    };
  } catch (error) {
    return {
      ok: false,
      failure: {
        path: repoPath,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
