# AGENTS.md — Gitfo

## Project Overview

Gitfo is a CLI tool that analyzes git commits and displays daily coding activity stats. It supports single-repo analysis and multi-repo scanning, with configurable date filters, author filtering, and multiple output formats.

## Tech Stack

- **Runtime:** Bun / Node.js (>=18)
- **Language:** TypeScript (ESM)
- **Key dependencies:** `commander` (CLI parsing), `simple-git` (git operations), `chalk` (terminal colors), `cli-table3` (table output), `date-fns` (date utilities)

## Project Structure

```
src/
├── cli.ts            # CLI entry point and command/option definitions (commander)
├── index.ts          # Main orchestration — parses args, runs analysis, outputs results
├── types.ts          # Shared TypeScript interfaces and types
├── core/
│   └── analyzer.ts   # Core logic: reads git log, computes per-day stats
├── output/
│   ├── summary.ts    # "summary" format renderer
│   └── table.ts      # "table" format renderer (cli-table3)
└── utils/
    ├── date.ts       # Date range helpers (today, yesterday, this-week, etc.)
    ├── git.ts        # Git command wrappers (simple-git)
    └── loader.ts     # Repo discovery for --scan mode
```

## Build & Run

```bash
bun run dev            # watch mode
bun run build          # compile TS → dist/
npm link               # make `gitfo` available globally
```

**Do not run** - Assume already running.

## Testing

```bash
bun run test           # run tests (vitest)
bun run test:coverage  # run with coverage
```

## Key Conventions

- **ESM only** — `"type": "module"` in package.json; use `import`/`export`, not `require`.
- **Merge commits excluded by default** — the `--include-merges` flag opts in.
- **Output formats:** `table` (default), `json`, `summary`.
- **Date filters** are mutually composable: `--since`, `--until`, `--today`, `--yesterday`, `--this-week`, `--last-week`, `--date`.
- Compiled output goes to `dist/`; the CLI entry point is `dist/index.js`.
