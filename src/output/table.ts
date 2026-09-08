import chalk from "chalk";
import Table from "cli-table3";
import { RepoStats, DateRange, MultiRepoStats } from "../types.js";
import { format } from "date-fns";

export function formatTable(
  stats: RepoStats,
  dateRange: DateRange,
  author: string | null,
  verbose: boolean = false,
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
  appendAnalysisFailures(output, stats);

  // Recent commits
  if (stats.commits.length > 0) {
    output.push("");
    output.push(chalk.bold(verbose ? "Commits:" : "Recent commits:"));
    const commitsToShow = verbose ? stats.commits.length : Math.min(5, stats.commits.length);

    for (let i = 0; i < commitsToShow; i++) {
      const commit = stats.commits[i];
      output.push(formatCommitLine(commit, verbose));
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

export function formatMultiRepoTable(
  stats: MultiRepoStats,
  dateRange: DateRange,
  author: string | null,
  verbose: boolean = false,
): string {
  const output: string[] = [];
  const startDate = format(dateRange.start, "yyyy-MM-dd");
  const endDate = format(dateRange.end, "yyyy-MM-dd");
  const dateHeader =
    startDate === endDate
      ? `Git Activity Across ${stats.totalRepositories} Repositories for ${startDate}`
      : `Git Activity Across ${stats.totalRepositories} Repositories from ${startDate} to ${endDate}`;

  output.push(chalk.bold.cyan(dateHeader));
  if (author) {
    output.push(chalk.gray(`Author: ${author}`));
  }
  output.push("");

  const totalsTable = new Table({
    style: { head: [], border: [] },
  });

  totalsTable.push(
    { Repositories: stats.totalRepositories.toString() },
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

  output.push(totalsTable.toString());
  appendRepoFailures(output, stats);

  if (stats.repositories.length === 0) {
    output.push("");
    output.push(
      chalk.yellow(
        stats.failedRepositories.length > 0
          ? "No repositories were successfully analyzed."
          : "No git repositories found in the scan paths.",
      ),
    );
    return output.join("\n");
  }

  const repoTable = new Table({
    head: ["Repository", "Commits", "Files", "Added", "Deleted", "Net"],
    style: { head: [], border: [] },
  });

  for (const repo of stats.repositories) {
    repoTable.push([
      repo.name,
      repo.totalCommits,
      repo.totalFilesChanged,
      chalk.green(`+${repo.totalLinesAdded}`),
      chalk.red(`-${repo.totalLinesDeleted}`),
      repo.netChange >= 0
        ? chalk.green(`+${repo.netChange}`)
        : chalk.red(repo.netChange.toString()),
    ]);
  }

  output.push("");
  output.push(chalk.bold("Per-repository breakdown:"));
  output.push(repoTable.toString());

  if (verbose) {
    for (const repo of stats.repositories) {
      output.push("");
      output.push(chalk.bold(`${repo.name} commits:`));
      appendAnalysisFailures(output, repo);

      if (repo.commits.length === 0) {
        output.push(chalk.yellow("  No commits found for this date range."));
        continue;
      }

      for (const commit of repo.commits) {
        output.push(formatCommitLine(commit, true));
      }
    }
  }

  return output.join("\n");
}

function formatCommitLine(
  commit: RepoStats["commits"][number],
  verbose: boolean,
): string {
  const shortHash = chalk.gray(commit.hash.substring(0, 7));
  const message = commit.message.split("\n")[0];

  if (!verbose) {
    const time = format(commit.date, "h:mm a");
    return `  ${shortHash} ${message} ${chalk.gray(`(${time})`)}`;
  }

  const timestamp = format(commit.date, "yyyy-MM-dd h:mm a");
  const added = chalk.green(`+${commit.linesAdded}`);
  const deleted = chalk.red(`-${commit.linesDeleted}`);
  return `  ${shortHash} ${chalk.gray(timestamp)} ${commit.author} | files: ${commit.filesChanged} | ${added} ${deleted} | ${message}`;
}

function appendAnalysisFailures(output: string[], stats: RepoStats): void {
  if (stats.analysisFailures.length === 0) {
    return;
  }

  output.push("");
  output.push(
    chalk.yellow(
      `Warning: ${stats.analysisFailures.length} commit(s) could not be analyzed.`,
    ),
  );
}

function appendRepoFailures(output: string[], stats: MultiRepoStats): void {
  if (stats.failedRepositories.length === 0) {
    return;
  }

  output.push("");
  output.push(
    chalk.yellow(
      `Warning: ${stats.failedRepositories.length} repo(s) could not be analyzed.`,
    ),
  );
}
