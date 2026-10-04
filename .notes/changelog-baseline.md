# Changelog baseline: Commander release history

Gitfo preserved every selected commit hash and subject and every per-commit file-status record in this bounded sample. A git-cliff configuration that preserves non-conventional messages recovered the same 21 commits. The observed differences are export structure, categorization, and configuration defaults; this evaluation establishes neither semantic superiority nor deployment or user impact.

## Dataset and provenance

- Public upstream: [tj/commander.js](https://github.com/tj/commander.js), a JavaScript CLI library with TypeScript declarations. No upstream code or dependency installation was executed.
- Fresh temporary directory: `/private/tmp/gitfo-changelog-baseline.NZ72N8`, created with `mktemp -d /private/tmp/gitfo-changelog-baseline.XXXXXX`.
- **Data clone:** `/private/tmp/gitfo-changelog-baseline.NZ72N8/commander.js`.
- Clone command: `git clone --quiet https://github.com/tj/commander.js.git /private/tmp/gitfo-changelog-baseline.NZ72N8/commander.js`. No depth or object filter was supplied. Measured once with `/usr/bin/time -p`: real 2.19 s, user 0.36 s, system 0.09 s, including network transfer and checkout.
- Observed clone HEAD: `ba6d13ddb4243e5913367734f8c159089ffe7834`; `git rev-parse --is-shallow-repository` returned `false`. There were 1,591 commits reachable through `--all` and 126 tags. `du -sh` reported 6.0 MiB for the checkout including 4.5 MiB for `.git`.
- **Useful consecutive release range:** `v12.0.0..v12.1.0`, also visible in the [upstream comparison](https://github.com/tj/commander.js/compare/v12.0.0...v12.1.0).

| Endpoint | Peeled commit SHA | Commit author date |
| --- | --- | --- |
| `v12.0.0`, excluded | `83c3f4e391754d2f80b179acc4bccc2d4d0c863d` | `2024-02-03T22:10:52+13:00` |
| `v12.1.0`, included | `970ecae402b253de691e6a9066fea22f38fe7431` | `2024-05-18T20:15:32+09:00` |

`git merge-base --is-ancestor v12.0.0 v12.1.0` succeeded. `git describe --tags --abbrev=0 v12.1.0^` returned `v12.0.0`; tags merged into the ending release but not the starting release consisted only of `v12.1.0`. This verifies adjacency on the selected ancestry. Git's two-dot range selects commits reachable from the ending ref while excluding those reachable from the starting ref. [Git revision-range documentation](https://git-scm.com/docs/gitrevisions#_dotted_range_notations)

The initial candidate `v13.0.0..v13.1.0` contained five commits. The selected range contained 21 and included TypeScript declarations, implementation, tests, dependency updates, and a broad formatting change, providing a larger but still small factual sample. This selection was not randomized. Both total and non-merge commit counts were 21; there are no merge commits in the evaluated range. Five distinct author-name strings occur, including a bot; these are names in history, not a deduplicated person count.

## Tools and execution boundary

| Tool | Exact observed version |
| --- | --- |
| Gitfo source CLI | `1.0.0` |
| Bun | `1.3.9` |
| Git | `git version 2.50.1 (Apple Git-155)` |
| Node, evaluation harness | `v22.23.2` |
| git-cliff | `git-cliff 2.14.2` |
| Platform | `Darwin arm64` |

The evaluation ran from `2026-10-04T18:29:53.712Z` to `2026-10-04T18:29:54.849Z`. Gitfo's workspace HEAD recorded by the harness was `76f60392ccd5baf02d9a9a049769bfc17f42cca9`. The main agent was independently updating the shared workspace; SHA-256 stamps of all 19 `src/` files were identical immediately before and after this evaluation. Those stamps are retained in the temporary `summary.json`, so the package version alone is not the implementation identifier.

No git-cliff binary was found on PATH. An official ephemeral binary was downloaded and extracted under the temporary directory from [release v2.14.2](https://github.com/orhun/git-cliff/releases/tag/v2.14.2), using the project's documented [binary-release installation route](https://git-cliff.org/docs/installation/binary-releases/):

- Archive: [git-cliff-2.14.2-aarch64-apple-darwin.tar.gz](https://github.com/orhun/git-cliff/releases/download/v2.14.2/git-cliff-2.14.2-aarch64-apple-darwin.tar.gz), 6,783,346 bytes in the official release metadata.
- Archive SHA-256: `a0be97e237d440d34c5e508ec21d070b2c85cbb8be48a46a56f9a4e8bd247f05`. The downloaded archive matched the digest reported by the [official release API](https://api.github.com/repos/orhun/git-cliff/releases/tags/v2.14.2). This is a checksum comparison, not an independent signature verification.
- Binary: `/private/tmp/gitfo-changelog-baseline.NZ72N8/git-cliff-2.14.2/git-cliff`.

The default template was generated with `git-cliff --init` in the temporary parent directory and passed explicitly as `--config .../cliff.toml`. Its SHA-256 is `4ff42d47555b589064193502a26e874535cf759fd9274d73fc266879141f50d4`. The preservation configuration below was created with `apply_patch`; its SHA-256 is `f6c975fcef2789a83ff02fc9e5dc99e258793af49e76528b64c8e642adbc03e0`.

Network access initially failed inside the sandbox; authorized escalated requests obtained the public clone and binary. The documentation-banner version `v2.14.0` returned HTTP 404 from the release API; the available release resolved to `v2.14.2`. An attempted `--init default` returned an embedded-template error, after which plain `--init` succeeded. These setup attempts are excluded from command timings.

Only `.notes/changelog-baseline.md` was written in the Gitfo repository by this baseline evaluation. It made no source, test, README, or package edits; no commits, pushes, global installs, builds, watch processes, linking, Gitfo `context` invocations, or held-out benchmarks. A background research agent performed this bounded comparison while implementation continued independently.

## Reproduction and oracle

Run the source CLI **from the data clone**, without building Gitfo:

```sh
cd /private/tmp/gitfo-changelog-baseline.NZ72N8/commander.js
bun /Users/abhi/dev/gitfo/src/index.ts changelog --from v12.0.0 --to v12.1.0 --format json

git log --no-merges --topo-order --no-show-signature --no-decorate -z --format='%H%x00%s' v12.0.0..v12.1.0 --

/private/tmp/gitfo-changelog-baseline.NZ72N8/git-cliff-2.14.2/git-cliff --config /private/tmp/gitfo-changelog-baseline.NZ72N8/cliff.toml --offline --no-exec --context v12.0.0..v12.1.0

/private/tmp/gitfo-changelog-baseline.NZ72N8/git-cliff-2.14.2/git-cliff --config /private/tmp/gitfo-changelog-baseline.NZ72N8/cliff-preserve.toml --offline --no-exec --context v12.0.0..v12.1.0
```

git-cliff's `--context` exports **changelog JSON**, as documented in [Print context](https://git-cliff.org/docs/usage/print-context/). It is unrelated to invoking Gitfo's new history-context command. Its JSON can also be loaded for rendering via `--from-context`. [Load context](https://git-cliff.org/docs/usage/load-context/)

The harness independently parsed Git's NUL-delimited hash/subject output and compared it to the flattened Gitfo commit records, including order and uniqueness. For **every** commit SHA it separately ran:

```sh
git diff-tree --no-commit-id --root -r -z --name-status --find-renames --no-ext-diff --no-textconv COMMIT_SHA --
```

Each file comparison used sorted `(status, path, previousPath)` tuples, then checked that their path union equaled Gitfo's `changedFiles`. This uses separate Git commands and parsing from Gitfo, but shares Git as the underlying data engine. It checks exported facts, not the independent truth of authored descriptions. Git documents non-merge selection and file-status output; rename detection uses a similarity threshold and is distinct from following a file through history. [Git log documentation](https://git-scm.com/docs/git-log)

git-cliff comparisons flattened each release's `commits`, compared `id` with Gitfo's `hash`, and compared the first line of `raw_message` with Git's subject. Comparing a parsed `message` directly would conflate formatting and factual preservation. The [version-pinned commit serializer](https://github.com/orhun/git-cliff/blob/v2.14.2/git-cliff-core/src/commit.rs#L517) documents that distinction.

Exact temporary `cliff-preserve.toml`:

```toml
[changelog]
body = "{{ version }}"
trim = true

[git]
conventional_commits = false
filter_unconventional = false
require_conventional = false
split_commits = false
commit_preprocessors = []
commit_parsers = [{ field = "merge_commit", pattern = "true", skip = true }]
filter_commits = false
protect_breaking_commits = false
link_parsers = []
topo_order_commits = true
sort_commits = "newest"
recurse_submodules = false
```

This configuration preserves raw messages without semantic grouping. git-cliff officially supports including unconventional commits and configuring parsers and filters. The merge-skip rule was not exercised because the chosen range has no merges. Ambient `GIT_CLIFF_*` configuration and forge token/repository environment overrides were removed for harness subprocesses; comparisons used `--offline --no-exec`. [git-cliff Git configuration](https://git-cliff.org/docs/configuration/git/), [CLI arguments](https://git-cliff.org/docs/usage/args/)

## Factual results

| Check | Observed result |
| --- | --- |
| Plain Git non-merge commits | 21 |
| Gitfo entries / unique hashes / matching subjects | 21 / 21 / 21; same order as Git |
| Gitfo file-status records checked against `diff-tree` | 227 / 227 match |
| File statuses | 223 modified, 3 added, 1 deleted |
| Gitfo distinct changed paths | 155; exact match to Git file-record union |
| Gitfo categories | 20 `other`, 1 `fixes`; no `features` or `breaking` |
| git-cliff default template | 2 commits, both real hashes and matching raw subjects; 19 omitted |
| git-cliff preservation configuration | 21 commits; no missing or extra hashes; all raw subjects and commit order match |
| git-cliff per-commit `statistics.files_changed` | Matches Gitfo's file-record count for all 21 preserved commits |

The default git-cliff template includes `ci: add 22.x to node-version (#2192)` and `Fix: Use node-prefixed requires for builtins (#2170)` (the actual subject includes backticks around `node`). It parses the latter as conventional but groups it under Other because the default `^fix` grouping expression is case-sensitive. Gitfo normalizes the recognized type's case and places it in `fixes`. This is a configuration/category policy difference, not evidence of a missing commit or incorrect Git history.

For example, the [argument auto-detection commit](https://github.com/tj/commander.js/commit/b9ca39062455d25b564269e832372c87a6569f8a) touches `Readme.md`, `lib/command.js`, `tests/command.parse.test.js`, and `typings/index.d.ts`. Gitfo puts its natural-language subject in `other`. The [TypeScript declaration removal](https://github.com/tj/commander.js/commit/d3b48f7fe7903b6c150415cb03d5e2992705fa29) touches `typings/index.d.ts` and `typings/index.test-d.ts`, also under `other`. Category totals therefore do not measure actual feature or compatibility-change coverage.

git-cliff's emitted JSON and v2.14.2 serializer expose commit identities, raw messages, author/committer metadata, parsed fields, and diff statistics, but no per-commit file-path/status array. Gitfo directly packages that array and its aggregate path union. Those observations are all recoverable from Git; having them together in one schema is practical packaging. git-cliff also exports fields absent from this Gitfo schema, such as committer metadata and insertion/deletion totals. Adding an external Git join to git-cliff could supply paths; that integration was not evaluated. [git-cliff context documentation](https://git-cliff.org/docs/templating/context/), [v2.14.2 serializer](https://github.com/orhun/git-cliff/blob/v2.14.2/git-cliff-core/src/commit.rs#L517)

## Timing methodology

The Node harness used synchronous child processes and `process.hrtime.bigint()` around each process invocation, capturing stdout/stderr in memory. After functional invocations and oracle checks, it ran one warmup per command and five sequential round-robin repetitions in the table's order. Source stamps were stable during the run. Timings include process startup and serialization, with warm OS caches; they exclude downloads, config creation, JSON comparison, and artifact writes. Parallel main-agent activity and machine load were uncontrolled.

| Command | Initial invocation, ms | Five measured samples, ms | Median, ms |
| --- | ---: | --- | ---: |
| Git hash/subject log | 7.261 | 6.804, 6.987, 7.094, 6.890, 6.737 | 6.890 |
| Gitfo source CLI JSON | 64.877 | 60.598, 58.809, 58.854, 58.275, 58.677 | 58.809 |
| git-cliff default JSON | 39.854 | 38.168, 38.359, 38.705, 39.263, 39.324 | 38.705 |
| git-cliff preservation JSON | 37.986 | 37.858, 38.164, 37.522, 38.023, 38.569 | 38.023 |

The separate 21 per-commit `diff-tree` oracle invocations plus parsing/comparison took 121.914 ms once. Git's timed log emits fewer fields than either JSON export; git-cliff's default export contains fewer commits; the preservation export has counts but not file paths. These are unequal workloads. This single small range cannot establish throughput, cold-start, scaling, or a performance ranking.

## Baseline interpretation limits

The [Prettier formatting commit](https://github.com/tj/commander.js/commit/1bdc749ac0c424bac94c9645dcfa3a4455a9c0c8) touches 132 files. **Inference:** a file appearing in a change list does not by itself establish an architectural dependency, an API change, or a required companion edit. The baseline records paths and authored subjects only; it does not evaluate history suggestions.

Git's rename detection is heuristic, and shallow or incomplete history changes available evidence. This clone is non-shallow, but the selected release range remains a short window. [Git log](https://git-scm.com/docs/git-log), [Git clone](https://git-scm.com/docs/git-clone)

This sample does not exercise merges, detected renames/copies, shallow-history failure modes, breaking-change categorization, or an empty range. Binary and unusual-filename handling were not separately validated. It is one selected CLI library release, with substantial formatting and dependency activity. No future-change recall, heldout prediction, context ranking, causal impact, publication, or deployment evaluation was performed. The main agent's `scripts/evaluate-history.ts` was not invoked.

## Retained evidence and practical finding

All generated evidence remains outside the Gitfo repository under `/private/tmp/gitfo-changelog-baseline.NZ72N8`:

- `evaluate.mjs`: exact harness; rerun with `node /private/tmp/gitfo-changelog-baseline.NZ72N8/evaluate.mjs` after checking the recorded source identity. Rerunning regenerates its temporary outputs.
- `summary.json`: exact timings, commands, source SHA-256 stamps, comparisons, default omissions, and example records.
- `gitfo.json`, `cliffDefault.json`, `cliffPreserve.json`: captured functional outputs.
- `plainGit.log.nul`, `plainGit-per-commit-files.json`: independent Git observations.
- `cliff.toml`, `cliff-preserve.toml`, the downloaded archive, and extracted git-cliff binary.

The clone and range are ready for the main agent's separate context work. This baseline supports factual preservation and a convenient combined export. Configured git-cliff already supplies equivalent commit identities and messages; defaults explain the observed omissions. A claim that history context adds useful semantic guidance requires its own bounded evaluation, which remains outside this task.
