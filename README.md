# Gitfo

A CLI tool to analyze git commits and show daily coding activity stats.

## Features

- Analyze commits in a single repository or scan multiple repositories to aggregate stats.
- Show daily coding activity stats including commits, files changed, lines added/deleted, and net change.
- Skip merge commits by default, and respect `.gitignore` during scan discovery.
- Filter by specific date ranges (e.g., `--today`, `--yesterday`, `--this-week`, `--since`, `--until`).
- Filter by author name or email.
- Output formats available: `table`, `json`, and `summary`.
- Verbose table output for full commit details.
- Fast, built with Bun and runs in a Node.js compatible environment.

## Installation

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Link globally to use the CLI
npm link # or bun link
```

## Usage

```bash
# Analyze the current repository for today
gitfo

# Analyze past week
gitfo --this-week

# Analyze specific date range
gitfo --since 2026-01-01 --until 2026-01-31

# Filter by author name or email
gitfo --author "user@example.com"

# Scan multiple repositories within a directory
gitfo --scan ~/projects

# Change output format
gitfo --format json
gitfo --format summary

# Show every matching commit with full details
gitfo --verbose

# Include merge commits
gitfo --include-merges
```

## Options

| Option              | Description                                    |
| :------------------ | :--------------------------------------------- |
| `--scan <paths...>` | Scan specific directories for git repositories |
| `--date <date>`     | Analyze a specific date                        |
| `--since <date>`    | Analyze from a specific date                   |
| `--until <date>`    | Analyze up to a specific date                  |
| `--today`           | Analyze today's commits                        |
| `--yesterday`       | Analyze yesterday's commits                    |
| `--this-week`       | Analyze this week's commits                    |
| `--last-week`       | Analyze last week's commits                    |
| `--author <name|email>` | Filter by author name or email             |
| `--format <type>`   | Output format (`table`, `json`, or `summary`)  |
| `--include-merges`  | Include merge commits                          |
| `-v, --verbose`     | Verbose output                                 |

## Scan Behavior

`gitfo --scan` recursively discovers git repositories up to the default scan depth. It skips `.git`, `node_modules`, and paths ignored by git ignore rules when available. If one repository cannot be analyzed, scan mode still reports successful repositories and includes a warning. JSON output includes failed repositories as structured records with `path` and `message`.

## Output Formats

- `table`: Human-readable default output.
- `summary`: Compact one-line output for scripts.
- `json`: Machine-readable stats, including commits, analysis failures, and scan failures.

`--verbose` only changes table output. It shows all commits in single-repo mode and per-repository commit breakdowns in scan mode.

## Release Checklist

```bash
bun run test
bun run build
node dist/index.js --version
node dist/index.js --help
```
