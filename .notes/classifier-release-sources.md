# classifier.dev: cli-v0.1.3..cli-v0.1.4 primary-source findings

Inspected 2026-10-05. Release snapshots: `cli-v0.1.3` → `f7bd20b4cf2b26308eae62b464188ffc5f034932`; `cli-v0.1.4` → `ea50568680531919d7f4cbe61356a99c5b956492` ([start tag](https://api.github.com/repos/mrmps/classifier-dev/git/ref/tags/cli-v0.1.3), [end tag](https://api.github.com/repos/mrmps/classifier-dev/git/ref/tags/cli-v0.1.4)). Findings establish authored release claims, not runtime verification. No clone, Gitfo run, commit-count analysis, dependency installation or remote-code execution was performed.

## What the CLI release actually claims

The authored changelog dates **0.1.4 to October 4, 2026**, and **0.1.3 to September 19, 2026**. It explicitly versions the CLI separately from the API. GitHub's release-by-tag endpoints returned 404 for [v0.1.3](https://api.github.com/repos/mrmps/classifier-dev/releases/tags/cli-v0.1.3) and [v0.1.4](https://api.github.com/repos/mrmps/classifier-dev/releases/tags/cli-v0.1.4); the repository changelog is the available authored release-note source. [Changelog][C]

| Substantiated v0.1.4 statement | Required scope and qualifications |
| --- | --- |
| Synchronous CLI classifications share training data by default; `--no-share-data` opts out and uses standard quotas; `--share-data` explicitly enables sharing and doubled quotas. | Apply opt-out on every invocation. Retention includes operator review; redaction is best effort and contributions remain until deleted. Billing and input-size safeguards do not double. Chat and background document jobs are excluded. [Changelog][C], [CLI README][R], [privacy policy source][P] |
| v0.1.4 includes previously unreleased whole-document upload support through `--document <file>`. | One UTF-8 document, funded workspace key, up to 10 million original tokens **and** a 100 MB body. Upload once and poll; server handles splitting, screening and retries. Document pricing is $0.084/M original tokens ($0.84 at 10M), with failed jobs refunded. [Changelog][C], [CLI README][R] |
| A keyless run's first rate-limit wait displays a one-time Pro hint using the API's `upgrade` link. | This is a CLI message, not removal of quotas. Published standard Pro allowances are 10× Free: Fast 30,000/minute and 200,000/day; Smart 2,000/minute and 20,000/day, before the sharing multiplier. [Changelog][C], [API docs][D] |

Document jobs are Fast/Jev only; signup credit alone does not qualify. Final inference reads at most **20,000 selected evidence tokens**, and eligible evidence can be omitted. Substantiate “uploads/processes a whole document,” not “the final model reads every token” or universal accuracy. `CLASSIFY_JOB_TIMEOUT` defaults to 86,400 seconds; interrupting the CLI does not cancel accepted work. Jobs expire after 24 hours; source/evidence are removed on completion, cancellation, failure or expiry, while results remain until expiry. Exclusion from training does not mean no temporary storage. [API docs][D], [CLI README][R], [privacy policy source][P]

Training retention applies to authenticated callers too; paying does not opt out. Opt-out preserves operational/billing records and any separately enabled workspace content logging. If training storage is unconfigured, default requests use standard quotas without collection; explicit sharing is rejected. [Privacy policy source][P]

## The range extends beyond the CLI

**Yes: the endpoint snapshots include Worker/API and site changes.** GitHub's source listings show different blobs for `src/index.ts` (Worker), `src/home.ts`, `src/pages.ts` and `src/docs.ts` (site/docs), plus new `src/dimensions.ts`, `src/document-upload.ts`, `src/long-context-job.ts` and `src/training-data.ts`. This establishes scope without duplicating the main agent's local Git/Gitfo verification. [Start source listing][S13], [end source listing][S14], [module responsibilities][ROOT]

Public docs at v0.1.4 additionally describe multi-dimension REST/MCP classification, paid long-context/document jobs, URL scraping/classification, and TypeSafe SDK compatibility. These are API/service statements, not additional CLI features named by its changelog. The pinned site privacy text makes default retention effective October 4; the [live privacy page](https://classifier.dev/privacy) and [live developer docs](https://classifier.dev/docs) corroborate it, but are mutable. [API docs][D], [privacy policy source][P], [root README][ROOT]

## Statements to keep out of “new in v0.1.4” copy

- Public Smart's 200-input/one-worker cap and `CLASSIFY_BATCH` validation were already released in v0.1.3. Plain/JSON/NDJSON inputs, ordered output, review/count/multi-label modes and the cited confidence measurements also predate this release. [Changelog][C], [v0.1.3 CLI README][OLD]
- “No key/account needed” describes ordinary public classification, not funded document uploads. Confidence is available only when supplied; multi-label output has per-label scores rather than a singular confidence, and escalated answers can be unscored. The documents do not establish a new speed or accuracy improvement in this CLI release. [CLI README][R], [API docs][D], [v0.1.3 CLI README][OLD]
- “Text is never stored” is obsolete: it appears in [v0.1.3 public docs][OD], while v0.1.4 documents default training retention. The root README's “no database” opening also conflicts with its later account/newsletter `DATABASE_URL` description; avoid treating that opening as a complete current architecture claim. [Privacy policy source][P], [root README][ROOT]

[C]: https://github.com/mrmps/classifier-dev/blob/ea50568680531919d7f4cbe61356a99c5b956492/cli/CHANGELOG.md#L3-L21
[R]: https://github.com/mrmps/classifier-dev/blob/ea50568680531919d7f4cbe61356a99c5b956492/cli/README.md
[D]: https://github.com/mrmps/classifier-dev/blob/ea50568680531919d7f4cbe61356a99c5b956492/src/docs.ts
[P]: https://github.com/mrmps/classifier-dev/blob/ea50568680531919d7f4cbe61356a99c5b956492/src/pages.ts#L717-L854
[ROOT]: https://github.com/mrmps/classifier-dev/blob/ea50568680531919d7f4cbe61356a99c5b956492/README.md
[OLD]: https://github.com/mrmps/classifier-dev/blob/f7bd20b4cf2b26308eae62b464188ffc5f034932/cli/README.md
[OD]: https://github.com/mrmps/classifier-dev/blob/f7bd20b4cf2b26308eae62b464188ffc5f034932/src/docs.ts#L279-L285
[S13]: https://api.github.com/repos/mrmps/classifier-dev/contents/src?ref=f7bd20b4cf2b26308eae62b464188ffc5f034932
[S14]: https://api.github.com/repos/mrmps/classifier-dev/contents/src?ref=ea50568680531919d7f4cbe61356a99c5b956492
