import { Command } from "commander";
import { CLIOptions } from "./types.js";

const program = new Command();

program
  .name("gitfo")
  .description(
    "A blazing-fast CLI tool to analyze git commits and show daily coding activity stats"
  )
  .version("1.0.0");

program
  .option(
    "-s, --scan <paths...>",
    "Scan multiple repositories in specified directories"
  )
  .option("-d, --date <date>", "Show stats for specific date (YYYY-MM-DD)")
  .option("-t, --today", "Show stats for today")
  .option("-w, --week", "Show stats for last 7 days")
  .option("-a, --author <email>", "Filter by git author email or name")
  .option("--format <type>", "Output format: table, json, or summary", "table")
  .option("--include-merges", "Include merge commits in stats")
  .option("-v, --verbose", "Show detailed commit information");

export function parseCLI(): CLIOptions {
  program.parse();
  const options = program.opts();

  return {
    scan: options.scan,
    date: options.date,
    today: options.today ?? false,
    week: options.week ?? false,
    author: options.author,
    format: options.format ?? "table",
    includeMerges: options.includeMerges ?? false,
    verbose: options.verbose ?? false,
  };
}

export { program };
