# Gitfo

[![CI](https://github.com/handshek/gitfo/actions/workflows/ci.yml/badge.svg)](https://github.com/handshek/gitfo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](package.json)

Gitfo is a small TypeScript CLI for reviewing daily coding activity from Git
history. It can analyze the current repository or scan a directory containing
multiple repositories, then render the result as a terminal table, one-line
summary, or JSON.

Gitfo is feature-complete for personal use and maintained as a portfolio
project.

## Features

- Count commits, files changed, lines added, lines deleted, and net change.
- Analyze one repository or aggregate multiple repositories in parallel.
- Filter by date range and author name or email.
- Exclude merge commits by default, with an option to include them.
- Render human-readable tables, script-friendly summaries, or structured JSON.
- Show full per-commit details with verbose table output.
- Continue a multi-repository scan when an individual repository fails.

## Requirements

- Git
- Node.js 18 or newer
- Bun 1.0 or newer for development and building from source

## Installation

Gitfo is currently installed from source:

```bash
git clone https://github.com/handshek/gitfo.git
cd gitfo
bun install --frozen-lockfile
bun run build
npm link
```

After linking, `gitfo` is available from any directory. Run
`npm unlink -g gitfo` to remove the global link.

## Usage

Run Gitfo inside a Git repository to analyze today's activity:

```bash
gitfo
```

Example summary:

```text
Commits: 4 | Files: 11 | +286 | -73 | Net: +213
```

Common commands:

```bash
# This week in the current repository
gitfo --this-week

# A specific date range
gitfo --since 2026-01-01 --until 2026-01-31

# Commits matching an author name or email
gitfo --author "user@example.com"

# Aggregate repositories found under one or more directories
gitfo --scan ~/projects ~/work

# Machine-readable output
gitfo --format json

# A single output line suitable for scripts
gitfo --format summary

# Every matching commit with author and diff details
gitfo --verbose

# Include merge commits in the totals
gitfo --include-merges
```

Run `gitfo --help` for the complete option list.

## Date filters

Gitfo defaults to today. The following date modes are available and mutually
exclusive:

| Option | Range |
| --- | --- |
| `--date YYYY-MM-DD` | One calendar day |
| `--since YYYY-MM-DD` | From a date through now |
| `--until YYYY-MM-DD` | All history through a date |
| `--today` | Today through the current time |
| `--yesterday` | The previous calendar day |
| `--this-week`, `--week` | Monday through now |
| `--last-week` | The previous Monday through Sunday |

## Output formats

- `table` is the default interactive terminal output and shows up to five
  recent commits unless `--verbose` is used.
- `summary` writes one clean line to stdout for shell scripts.
- `json` includes commit records, analysis failures, repository failures, and
  aggregate totals.

## Scan behavior and limitations

- Repository discovery searches three directory levels deep by default.
- Discovery skips `.git`, `node_modules`, and Git-ignored paths when Git can
  evaluate the ignore rules. Outside a Git worktree, the fallback ignore parser
  supports common literal directory patterns but not every `.gitignore`
  feature.
- Gitfo stops descending after it finds a repository root, so nested
  repositories are not included beneath that root.
- Without `--author`, Gitfo uses the current or global Git user name, then
  email. Scan mode applies that identity to every discovered repository.
- “Files changed” is the sum of files touched per commit, not a count of unique
  files across the complete date range.

## Development

```bash
bun install --frozen-lockfile
bun run test
bun run test:coverage
bun run build
bun run test:package
```

Continuous integration runs the test suite, build, coverage report, and packed
installation smoke test on the minimum supported Node.js release and a current
Node.js release.

## Project structure

```text
src/
├── cli.ts              command-line options
├── index.ts            application orchestration
├── core/               repository analysis, scanning, and aggregation
├── output/             table, summary, and JSON renderers
└── utils/              date, Git, loader, parallel, and version helpers
```

## License

[MIT](LICENSE)
