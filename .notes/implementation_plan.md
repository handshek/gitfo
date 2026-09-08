# Gitfo Implementation Plan

## Overview

CLI tool to analyze git commits and show daily coding activity stats.

**Key Decisions:**

- Package name: `gitfo`
- Runtime: Bun + Node.js compatible
- Testing: Vitest
- Skip merge commits by default, show gross+net changes, respect .gitignore

---

## Step-by-Step Implementation

### Step 1: Project Setup

**Goal:** Working TypeScript project that compiles and runs

**Create:**

- `package.json` - dependencies, scripts, bin entry
- `tsconfig.json` - TypeScript config
- `.gitignore` - ignore node_modules, dist
- `src/index.ts` - just prints "gitfo v1.0.0"

**Verify:**

```bash
bun install
bun run build
node dist/index.js  # prints "gitfo v1.0.0"
```

---

### Step 2: Basic CLI with --help and --version

**Goal:** Working CLI that parses arguments

**Create:**

- `src/cli.ts` - commander setup with options (no implementation yet)
- `src/types.ts` - CLIOptions interface

**Options to define:**

- `--scan <paths...>`
- `--date <date>`
- `--since <date>`, `--until <date>`
- `--today`, `--yesterday`, `--this-week`, `--last-week`
- `--author <email>`
- `--format <type>` (table|json|summary)
- `--include-merges`
- `-v, --verbose`

**Verify:**

```bash
gitfo --help     # shows all options
gitfo --version  # shows 1.0.0
```

---

### Step 3: Date Range Parsing

**Goal:** Parse all date options into a start/end range

**Create:**

- `src/utils/date.ts` - date parsing functions

**Functions:**

- `parseDateRange(options)` - main entry point
- `getToday()`, `getYesterday()`, `getThisWeek()`, `getLastWeek()`
- `formatDateForGit(date)` - format for git commands

**Verify:**

```bash
gitfo  # prints "Analyzing: 2026-01-11 to 2026-01-11" (defaults to today)
gitfo --today  # prints "Analyzing: 2026-01-11 to 2026-01-11"
gitfo --yesterday  # prints "Analyzing: 2026-01-10 to 2026-01-10"
gitfo --this-week  # prints correct week range
```

---

### Step 4: Git User Detection

**Goal:** Get current git user email from config

**Create:**

- `src/utils/git.ts` - git helper functions

**Functions:**

- `isGitRepo(path)` - check if directory is a git repo
- `getGitUserEmail(path?)` - get user.email from git config

**Verify:**

```bash
gitfo  # prints "Author: your@email.com"
gitfo --author "other@email.com"  # prints "Author: other@email.com"
```

---

### Step 5: Single Repo Commit Analysis (Core Feature)

**Goal:** Analyze commits in current repo and show stats

**Create:**

- `src/core/analyzer.ts` - commit analysis logic

**Functions:**

- `analyzeRepository(path, options)` - returns RepoStats

**Add to types.ts:**

- `CommitInfo`, `RepoStats`, `DateRange` interfaces

**Verify:**

```bash
gitfo  # shows commit count, files changed, lines added/deleted for today
gitfo --yesterday  # shows yesterday's stats
```

---

### Step 6: Table Output Formatter

**Goal:** Pretty table output with colors

**Create:**

- `src/output/table.ts` - table formatting

**Output format:**

```
Git Activity for 2026-01-11

Commits:        5
Files Changed:  12
Lines Added:    +234
Lines Deleted:  -67
Net Change:     +167

Recent commits:
  - feat: add user auth (10:23 AM)
  - fix: resolve bug (2:45 PM)
```

**Verify:**

```bash
gitfo  # shows pretty formatted table with colors
```

---

### Step 7: JSON Output Formatter

**Goal:** Machine-readable JSON output

**Create:**

- `src/output/json.ts` - JSON formatting

**Verify:**

```bash
gitfo --format json  # outputs valid JSON
gitfo --format json | jq .  # parseable by jq
```

---

### Step 8: Summary Output Formatter

**Goal:** One-line summary for scripts

**Create:**

- `src/output/summary.ts` - summary formatting

**Verify:**

```bash
gitfo --format summary
# outputs: "Commits: 5 | Files: 12 | +234 | -67 | Net: +167"
```

---

### Step 9: Repository Scanner (Multi-Repo)

**Goal:** Find git repos in specified directories

**Create:**

- `src/core/scanner.ts` - directory scanning

**Functions:**

- `findGitRepos(paths, maxDepth)` - recursively find repos

**Verify:**

```bash
gitfo --scan ~/projects  # finds and lists repos
```

---

### Step 10: Parallel Processing

**Goal:** Analyze multiple repos in parallel

**Create:**

- `src/utils/parallel.ts` - parallel execution helper
- `src/core/aggregator.ts` - combine stats from multiple repos

**Verify:**

```bash
gitfo --scan ~/projects  # shows per-repo breakdown + totals
```

---

### Step 11: Error Handling

**Goal:** Graceful error messages for all edge cases

**Handle:**

- Not in a git repo
- Git not installed
- Invalid date format
- No commits found
- Permission denied

**Verify:** Test each error case manually

---

### Step 12: Tests

**Goal:** >80% test coverage

**Create:**

- `tests/unit/date.test.ts`
- `tests/unit/git.test.ts`
- `tests/unit/analyzer.test.ts`
- `tests/integration/cli.test.ts`
- `vitest.config.ts`

**Verify:**

```bash
bun run test
bun run test:coverage
```

---

### Step 13: Documentation & Polish

**Goal:** Release-ready

**Create/Update:**

- `README.md` - full documentation
- Enhanced `--help` text with examples
- Final `package.json` metadata

---

## File Structure (Final)

```
gitfo/
├── src/
│   ├── index.ts          # Entry point
│   ├── cli.ts            # CLI setup
│   ├── types.ts          # TypeScript types
│   ├── core/
│   │   ├── analyzer.ts   # Commit analysis
│   │   ├── scanner.ts    # Repo discovery
│   │   └── aggregator.ts # Stats aggregation
│   ├── output/
│   │   ├── table.ts      # Table formatter
│   │   ├── json.ts       # JSON formatter
│   │   └── summary.ts    # Summary formatter
│   └── utils/
│       ├── git.ts        # Git helpers
│       ├── date.ts       # Date parsing
│       └── parallel.ts   # Parallel processing
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Dependencies

**Runtime:**

- `simple-git` - Git operations
- `chalk` - Terminal colors
- `cli-table3` - Formatted tables
- `commander` - CLI argument parsing
- `date-fns` - Date handling

**Dev:**

- `typescript`
- `vitest`
- `@types/node`

---

## Verification After Each Step

Each step should:

1. Compile without errors (`bun run build`)
2. Run without crashing (`gitfo`)
3. Pass any existing tests (`bun run test`)
