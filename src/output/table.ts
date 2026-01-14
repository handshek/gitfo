import chalk from "chalk";
import Table from "cli-table3";
import { RepoStats, DateRange } from "../types.js";
import { format } from "date-fns";

export function formatTable(
  stats: RepoStats,
  dateRange: DateRange,
  author: string | null,
): string {
  const output: string[] = [];

  // Header
  const startDate = format(dateRange.start, "yyyy-MM-dd");
  const endDate = format(dateRange.end, "yyyy-MM-dd");
  const dateHeader =
    startDate === endDate
      ? `Git Activity for ${startDate}`
      : `Git Activity from ${startDate} to ${endDate}`;

  output.push(chalk.bold.cyan(dateHeader));
  if (author) {
    output.push(chalk.gray(`Author: ${author}`));
  }
  output.push("");

  // Stats table with borders
  const table = new Table({
    style: { head: [], border: [] },
  });

  table.push(
    { Commits: stats.totalCommits.toString() },
    { "Files Changed": stats.totalFilesChanged.toString() },
    { "Lines Added": chalk.green(`+${stats.totalLinesAdded}`) },
    { "Lines Deleted": chalk.red(`-${stats.totalLinesDeleted}`) },
    {
      "Net Change":
        stats.netChange >= 0
          ? chalk.green(`+${stats.netChange}`)
          : chalk.red(stats.netChange.toString()),
    },
  );

  output.push(table.toString());

  // Recent commits
  if (stats.commits.length > 0) {
    output.push("");
    output.push(chalk.bold("Recent commits:"));
    const commitsToShow = Math.min(5, stats.commits.length);

    for (let i = 0; i < commitsToShow; i++) {
      const commit = stats.commits[i];
      const time = format(commit.date, "h:mm a");
      const shortHash = chalk.gray(commit.hash.substring(0, 7));
      const message = commit.message.split("\n")[0]; // First line only
      output.push(`  ${shortHash} ${message} ${chalk.gray(`(${time})`)}`);
    }

    if (stats.commits.length > commitsToShow) {
      const remaining = stats.commits.length - commitsToShow;
      output.push(chalk.gray(`  ... and ${remaining} more`));
    }
  } else {
    output.push("");
    output.push(chalk.yellow("No commits found for this date range."));
  }

  return output.join("\n");
}
