# Releasing Gitfo

Version 1.1.0 is currently a local release candidate. Preparing or verifying
it does not create a tag, a GitHub release, or an npm publication.

## Prepare and verify

1. Update only `package.json` for the version. Use a patch for fixes, a minor
   for backward-compatible commands, and a major for incompatible changes.
   Update `CHANGELOG.md`; do not duplicate the version in CLI source or tests.
2. Install development dependencies with `bun install --frozen-lockfile`.
3. Run `bun run test:release` from the repository root. This runs coverage
   tests, compiles the CLI, checks the package allowlist, and installs the
   resulting tarball into a fresh temporary directory. Installed checks cover
   version/help, changelog Markdown/JSON, historical context, and JSON errors.
4. Inspect `artifacts/gitfo-1.1.0.tgz` and its `.sha256` checksum. The tarball
   contains compiled output, package metadata, license, README, changelog,
   and this release guide—not tests, notes, dependencies, or credentials. These files are
   ignored by Git and replaced by a new successful verification run.
5. Commit the source, version, and release notes. Run verification again if
   any packaged files change. Confirm `git status --short` is empty before
   considering the candidate final.

`bun run test:package` performs the installed smoke test without retaining an
artifact. To choose another destination, use
`bun run test:package --pack-destination /path/to/artifacts` after building.
Packing does **not** run `prepublishOnly`; a fresh build is required, which
`test:release` provides. See [npm's lifecycle documentation](https://docs.npmjs.com/cli/v11/using-npm/scripts/).

The CI workflow can also be run manually. It checks Node.js 18 and 24, retains
each job's verified package as an Actions artifact, and rejects `v` tags that
do not match `package.json`. CI has read-only repository permissions and no
publishing credentials; it never publishes a package or creates a release.

## Publish only with explicit approval

After approval, push the verified commit, wait for both CI jobs, and create an
annotated tag with the same version (`v1.1.0`) on that exact commit. Push only
that tag, then confirm its CI checks pass. If publishing files have changed,
rebuild and reverify the artifact; never move an already published tag.

Before npm publication, confirm ownership of the `gitfo` package name and
the intended registry/account. Publish the exact verified tarball, not a new
unverified working-directory package. Create the matching GitHub release
with reviewed release notes and attach that tarball and its checksum.
Remove the “prepared, not published” status from the release notes before
final verification/publication, and add the actual release date.

Automatic npm publication is deliberately absent. If added later, use a
protected release environment, explicit approval, least-privilege credentials
or trusted publishing, and the same verified artifact. Credentials must not
be committed. These are release instructions, not authorization to publish.
