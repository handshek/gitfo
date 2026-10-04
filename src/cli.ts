import { Command, Option } from "commander";
import { CLIOptions, ChangelogOptions } from "./types.js";
import { getPackageVersion } from "./utils/version.js";

const program = new Command();

program
  .name("gitfo")
  .enablePositionalOptions()
  .description(
    "A blazing-fast CLI tool to analyze git commits and show daily coding activity stats",
  )
  .version(getPackageVersion());

program
  .option(
    "-s, --scan <paths...>",
    "Scan multiple repositories in specified directories",
  )
  .option("-d, --date <date>", "Show stats for specific date (YYYY-MM-DD)")
  .option("--since <date>", "Show stats from specific date (YYYY-MM-DD)")
  .option("--until <date>", "Show stats until specific date (YYYY-MM-DD)")
  .option("-t, --today", "Show stats for today")
  .option("--yesterday", "Show stats for yesterday")
  .option("--this-week", "Show stats for this week")
  .option("--last-week", "Show stats for last week")
  .option("-w, --week", "Alias for --this-week")
  .option("-a, --author <name|email>", "Filter by git author name or email")
  .addOption(
    new Option("--format <type>", "Output format").choices([
      "table",
      "json",
      "summary",
    ]).default("table"),
  )
  .option("--include-merges", "Include merge commits in stats")
  .option("-v, --verbose", "Show detailed commit information")
  .action(() => {});

let subcommand: ChangelogOptions | undefined;
program.command("changelog")
  .description("Extract factual release entries from an explicit Git range (all authors)")
  .requiredOption("--from <ref>", "Starting tag, branch, or commit (exclusive)")
  .requiredOption("--to <ref>", "Ending tag, branch, or commit (inclusive)")
  .addOption(new Option("--format <type>", "Output format").choices(["markdown", "json"]).default("markdown"))
  .action(options => { subcommand = { command: "changelog", ...options, withContext: false }; });

export function parseCLI(): CLIOptions | ChangelogOptions {
  program.parse();
  if (subcommand) return subcommand;
  const options = program.opts();

  return {
    scan: options.scan,
    date: options.date,
    since: options.since,
    until: options.until,
    today: options.today ?? false,
    yesterday: options.yesterday ?? false,
    thisWeek: options.thisWeek ?? false,
    lastWeek: options.lastWeek ?? false,
    week: options.week ?? false,
    author: options.author,
    format: options.format ?? "table",
    includeMerges: options.includeMerges ?? false,
    verbose: options.verbose ?? false,
  };
}

export { program };
