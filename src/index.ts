import { parseCLI, program } from "./cli.js";
import { parseDateRange } from "./utils/date.js";
import { getGitUserName, getGitUserEmail, isGitRepo } from "./utils/git.js";
import { analyzeRepository } from "./core/analyzer.js";
import { formatTable, formatMultiRepoTable } from "./output/table.js";
import { formatSummary, formatMultiRepoSummary } from "./output/summary.js";
import { createLoader } from "./utils/loader.js";
import { findGitRepos } from "./core/scanner.js";
import { runInParallel } from "./utils/parallel.js";
import { aggregateRepositories } from "./core/aggregator.js";
import { cwd } from "process";

// Parse CLI - commander will handle --help and --version automatically
const options = parseCLI();

// If no args provided at all, show help (like git does)
if (process.argv.length <= 2) {
  program.help();
}

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
      if (!isGitRepo(currentDir)) {
        console.error("Error: Not in a git repository.");
        console.error(
          "Run this command in a git repo, or use --scan to scan multiple repos.",
        );
        process.exit(1);
      }

      // Analyze current repository with loading animation
      const loader = createLoader("Analyzing commits...", "diff");
      loader.start();

      try {
        const stats = await analyzeRepository(
          currentDir,
          dateRange,
          author,
          options.includeMerges ?? false,
        );
        loader.stop();

        // Output formatted results based on format option
        const format = options.format ?? "table";
        let output: string;

        switch (format) {
          case "summary":
            output = formatSummary(stats);
            break;
          case "json":
            console.log("JSON format not yet implemented");
            process.exit(1);
          case "table":
          default:
            output = formatTable(stats, dateRange, author);
        }

        console.log(output);
      } catch (err) {
        loader.stop("✗ Failed to analyze repository");
        throw err;
      }
    } else {
      const loader = createLoader("Scanning repositories...", "hash");
      loader.start();

      try {
        const repoPaths = findGitRepos(options.scan);
        const repositories = await runInParallel(repoPaths, async (repoPath) =>
          analyzeRepository(
            repoPath,
            dateRange,
            author,
            options.includeMerges ?? false,
          ),
        );
        const aggregated = aggregateRepositories(repositories);
        loader.stop();

        const format = options.format ?? "table";
        let output: string;

        switch (format) {
          case "summary":
            output = formatMultiRepoSummary(aggregated);
            break;
          case "json":
            console.log("JSON format not yet implemented");
            process.exit(1);
          case "table":
          default:
            output = formatMultiRepoTable(aggregated, dateRange, author);
        }

        console.log(output);
      } catch (err) {
        loader.stop("✗ Failed to scan repositories");
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
