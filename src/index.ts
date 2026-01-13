import { parseCLI, program } from "./cli.js";
import { parseDateRange, formatDateForGit } from "./utils/date.js";
import { getGitUserEmail, isGitRepo } from "./utils/git.js";
import { analyzeRepository } from "./core/analyzer.js";
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
    const startDate = formatDateForGit(dateRange.start);
    const endDate = formatDateForGit(dateRange.end);

    console.log(`Analyzing: ${startDate} to ${endDate}`);

    // Get author
    const author = options.author || (await getGitUserEmail());
    if (author) {
      console.log(`Author: ${author}`);
    } else {
      console.log("Author: (not specified)");
    }

    // Check if we're in a git repo
    const currentDir = cwd();
    if (!options.scan) {
      if (!isGitRepo(currentDir)) {
        console.error("Error: Not in a git repository.");
        console.error(
          "Run this command in a git repo, or use --scan to scan multiple repos."
        );
        process.exit(1);
      }

      // Analyze current repository
      const stats = await analyzeRepository(
        currentDir,
        dateRange,
        author,
        options.includeMerges ?? false
      );

      console.log("\nStats:");
      console.log(`Commits: ${stats.totalCommits}`);
      console.log(`Files Changed: ${stats.totalFilesChanged}`);
      console.log(`Lines Added: +${stats.totalLinesAdded}`);
      console.log(`Lines Deleted: -${stats.totalLinesDeleted}`);
      console.log(
        `Net Change: ${stats.netChange >= 0 ? "+" : ""}${stats.netChange}`
      );
    } else {
      console.log("Multi-repo scanning not yet implemented");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
})();
