# Changelog

## 1.1.0 — prepared, not published

### Added

- `changelog --from <ref> --to <ref>` exports authored release commits as
  Markdown or versioned JSON, including supporting commits and file statuses.
- `context --files <paths...>` and `context --working-tree` suggest companion
  files from historical co-changes, with supporting evidence and limitations.
- `changelog --with-context` attaches that advisory history at the starting
  ref, without using release commits as their own evidence.
- JSON-mode application failures use a documented, versioned stderr envelope
  with stable error codes and a nonzero exit status.
- `test:release` validates tests, compilation, package contents, and a fresh
  installed CLI; it retains the verified tarball and SHA-256 checksum.

### Fixed

- File-context selections normalize directory aliases to repository paths.
- Date-sensitive activity tests keep their fixtures within the current day.

Activity commands and their successful JSON output remain unchanged. History
suggestions are advisory, not proven dependencies. Changelog entries do not
establish customer benefits or deployment status.

## 1.0.0

- Daily Git activity analysis, date/author filters, multi-repository scanning,
  and table, summary, and JSON output.
- Package-metadata-backed CLI version and Bun/Node.js execution support.

See the [GitHub releases](https://github.com/handshek/gitfo/releases) for
previous release metadata.
