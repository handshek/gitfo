# Changelog and history-context milestone

Implemented the approved, local-first CLI scope: factual changelog extraction,
advisory file-history context, and the same context attached to release entries
at the starting ref. No AI calls, forge APIs, database, daemon, service design,
or video generation were added. Existing activity behavior and JSON remain
separate and unchanged.

## Reproduce the value checks

```sh
# Clone Commander into a disposable directory, with full history.
git clone https://github.com/tj/commander.js.git /path/to/commander.js
bun scripts/evaluate-history.ts /path/to/commander.js v12.0.0 v12.1.0 25

# Evaluate the original Gitfo history, excluding this implementation.
bun scripts/evaluate-history.ts . 71a23df7f12962ff8769a786748fff846fd79734 60a3b5d98ddbc134dc720d3c129c470140afc060 12
```

The [changelog baseline](changelog-baseline.md) records the exact public clone,
resolved refs, tool versions, primary sources, Git/git-cliff comparisons,
configuration, and process-level timings. The [held-out results](history-evaluation.json)
retain every selected target, prediction, observed companion, miss, and
history endpoint. `scripts/evaluate-history.ts` is the reproducible harness.

## Changelog preservation versus existing tools

The Commander `v12.0.0..v12.1.0` range has 21 non-merge commits. Gitfo's 21
hashes/subjects and 227 file-status records matched separate plain-Git
observations. A preservation-configured git-cliff 2.14.2 also returned all 21
commits. Its default template omitted 19 because of message filtering, which
is configurable behavior rather than an inherent lack of capability.

Gitfo provides paths/statuses and authored commits together in a versioned
export without configuration. That is integration convenience, not evidence
that it interprets changes better than Git plus configured git-cliff. The
same facts remain recoverable from Git. Twenty Commander entries were “Other
changes” because their subjects were not recognized `feat:`/`fix:` messages;
categories do not establish actual product-change coverage.

## Held-out co-change results

Each eligible held-out commit has one parent and touches 2–30 paths. The
deterministic target is its first sorted source path, excluding common test
and example locations, or its first path when no source path matches.
Companions are computed strictly from the held-out commit's parent history,
using the shipped thresholds, without fitting them to the test sample.
Remaining paths in that commit are the observed comparison set.

| Dataset | Held-out samples | Suggestions | Observed companions | Matched suggestions | Observed precision | Observed recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Commander v12.0.0 → v12.1.0 | 7 | 28 | 37 | 8 | 28.6% | 21.6% |
| Gitfo's original ten-commit range | 10 | 6 | 46 | 0 | 0% | 0% |

Six Commander samples produced suggestions, and all six had at least one
match. That includes three straightforward package/lockfile edits. One
source-file case suggested both the documentation and TypeScript declarations
that were actually edited, but missed the relevant runtime test. The Gitfo
sample mostly had too little preceding history to meet the threshold and
returned no matching suggestions.

Selected examples, inspected against their actual commit changes:

- [Commander argument auto-detection](https://github.com/tj/commander.js/commit/b9ca39062455d25b564269e832372c87a6569f8a):
  target `lib/command.js`; suggestions recovered `Readme.md` and
  `typings/index.d.ts`, both in the actual change. The suggestions also included
  three paths not edited there and missed `tests/command.parse.test.js`.
- [Commander TypeScript cleanup](https://github.com/tj/commander.js/commit/d3b48f7fe7903b6c150415cb03d5e2992705fa29):
  target `typings/index.d.ts`; suggested `typings/index.test-d.ts`, which actually
  removed the corresponding assertion. Four other suggestions were not edited.
- [Commander JSDoc lint fixes](https://github.com/tj/commander.js/commit/b95ea4479a27fefb1e311454930ccaf3ab58b723):
  selected target `eslint.config.js` had only two eligible preceding edits, so
  there were no suggestions despite six actual companion paths.
- [Gitfo version centralization](https://github.com/handshek/gitfo/commit/5115d9ab9b96defb2a831ba24added5fcf31b2bf):
  target `src/cli.ts`; the suggested `src/index.ts` was not edited, while the
  new version loader and two tests had insufficient prior support.

“Matched” means co-edited, **not proven necessary**. “Not observed” means not
co-edited, **not proven irrelevant**. The sample is small, selected rather than
random, contains maintenance work, and chooses only one target per commit.
It does not establish bug-prevention effectiveness, causal dependencies,
deployment status, or a comparison against an agent already aggregating Git
history. Internal-call timings in the JSON exclude CLI startup and should not
be compared to the baseline's process timings.

## Decision

The evidence supports shipping the factual export and an explicitly advisory
history tool. It does **not** justify advertising a reliable dependency
detector, an essential agent harness, or an exponential improvement. Further
investment should first evaluate more repositories and real review tasks
against a Git/git-cliff-based agent baseline; precision is currently noisy.
Do not add MCP, AI rewriting, persistent storage, or automated required-edit
enforcement on the strength of this sample.

## Verification and release follow-up

- Initial unit/integration coverage run: 61 passing tests; the existing test
  that invokes a build was deliberately excluded under `AGENTS.md`.
- On 2026-10-05, the user explicitly authorized rebuilding, verifying, and
  pushing. `bun run build` and the full `bun run test:coverage` passed:
  **62 tests, no skips**, including the compiled CLI/shebang test.
- TypeScript source and benchmark harness: `tsc --noEmit` passed.
- Bun source CLI: changelog Markdown/JSON, context Markdown/JSON, help,
  version, old activity commands, invalid refs, merge and squash behavior,
  annotated tags, unusual paths, directory aliases, working-tree selection,
  sparse/shallow histories, and the 1,000-eligible-commit window were exercised.
- Compiled CLI checks under Node.js 22.23.2 passed: version, root/subcommand
  help, Markdown changelogs, JSON changelogs with context anchored at `--from`,
  and working-tree JSON context.
- `bun run test:package` passed after packing and installing into a fresh
  temporary directory. The installed CLI passed version/help checks,
  changelog Markdown/JSON with historical context, and file-context JSON.
  The first sandboxed attempt could not resolve the npm registry; the rerun
  with network access succeeded. Local runtime verification used Node.js 22;
  the minimum Node.js 18 remains part of the existing CI matrix.
- Midnight-crossing activity fixtures were corrected separately in `a2afe76`;
  no activity implementation was changed.

README additions preserve all previous content, including acknowledgements and
the star footer. No version bump, upstream issue mutation, or npm publishing
was performed.
