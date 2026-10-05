# Real-world check: classifier.dev

Read-only verification on 2026-10-05 using the public
[classifier.dev repository](https://github.com/mrmps/classifier-dev).
Mintlify's `mint` repository was not accessible through GitHub's public
repository endpoint, so classifier.dev was the available user-suggested case.
No third-party code, dependencies, service calls, deploys, or posts were run.

## Reproduce

Use a full clone to avoid network-dependent lazy object fetches:

```sh
git clone https://github.com/mrmps/classifier-dev.git /path/to/classifier-dev
# Build Gitfo first, then run from the Gitfo checkout:
node scripts/verify-changelog.mjs /path/to/classifier-dev cli-v0.1.3 cli-v0.1.4
```

To consume the actual evidence in a script or agent, run the compiled Gitfo
entry point from that clone:

```sh
node /path/to/gitfo/dist/index.js changelog \
  --from cli-v0.1.3 --to cli-v0.1.4 --with-context --format json
```

The comparison harness is independent of Gitfo's history parser: it checks
`git log`, per-commit `git show`, NUL-delimited `git diff-tree`, and ancestor
membership from `git rev-list`. It asserts source/compiled output equality
and unchanged repository status. It does not assess semantic correctness,
performance superiority, deployment status, or necessary companion edits.

## Results

| Check | Result |
| --- | --- |
| Starting commit | `f7bd20b4cf2b26308eae62b464188ffc5f034932` |
| Ending commit | `ea50568680531919d7f4cbe61356a99c5b956492` |
| Non-merge commits | 110, all matched Git |
| File-status records | 1,394, all matched Git, including rename origins |
| Distinct changed paths | 463, union matched Git |
| Subjects, bodies, authors, dates, parents | All matched independent Git records |
| Categories | 110 “Other”; no conventional `feat:` / `fix:` subjects |
| Commits touching `cli/` | 9 of 110 |
| Context anchoring | Every entry uses the starting commit; every evidence commit is its ancestor or that commit |
| Source versus compiled JSON | Identical |
| Clone status | Clean before and after |

One warmed process run took 133 ms with Bun source and 153 ms with compiled
Node.js 22.23.2, including CLI startup and history context. These are single
observations, not a benchmark. A first partial-clone attempt needed Git to
fetch missing blobs; after fetching those public objects, the checks ran
without network access. The output contained 1,573 companion suggestions
across repeated per-entry file selections, **not** 1,573 unique dependencies
or validated required edits. Their relevance was not measured in this check.

## What this means for a changelog-video workflow

This is a repository-wide interval between **CLI** tags, not a ready-made
list of CLI features. It includes many backend, billing, website, and
maintenance changes. Filter candidates using file evidence, then check the
authored release notes before making a video brief. Gitfo exports the evidence;
the consumer selects and rewrites it with human approval.

The [primary-source review](classifier-release-sources.md) checked the pinned
CLI changelog and documentation. Three supported candidates are whole-document
uploads (with funded-key and input-size requirements), explicit training-data
sharing controls (including opt-out; sharing is **on by default**), and the
one-time upgrade hint during a keyless rate-limit wait. These are authored
release claims, not live product tests. Privacy retention and document
screening limitations must survive any customer-facing rewrite.

Evidence examples:

- [Document upload implementation](https://github.com/mrmps/classifier-dev/commit/d16139f60da569ccd0baaef7b8cbe4c26d8ef0ef)
  and the pinned CLI notes support an upload-oriented demo, not a claim that
  final inference reads every original token.
- [Default-sharing and privacy change](https://github.com/mrmps/classifier-dev/commit/ea50568680531919d7f4cbe61356a99c5b956492)
  requires privacy review before being turned into promotional copy.
- [Upgrade-message change](https://github.com/mrmps/classifier-dev/commit/c7df26fef1768f10202b8e6b8ecea792a6ccd379)
  is a CLI affordance, not removal of API quotas.

The result supports using Gitfo as the factual input to a video brief.
Automatic product-impact claims, automatic scene generation, reliable
dependency detection, and live deployment validation remain outside its scope.
