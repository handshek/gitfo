// Read-only preservation check against independent Git commands, not Gitfo's parser.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [directory, from, to, ...extra] = process.argv.slice(2);
if (!directory || !from || !to || extra.length) {
  throw new Error("Usage: node scripts/verify-changelog.mjs <repository> <from> <to> (build first)");
}
const options = { cwd: directory, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", NO_COLOR: "1" } };
const git = (...args) => execFileSync("git", args, options);
const before = git("status", "--porcelain");
const args = ["changelog", "--from", from, "--to", to, "--with-context", "--format=json"];
const run = (runtime, path) => {
  const start = performance.now();
  const data = JSON.parse(execFileSync(runtime, [fileURLToPath(new URL(path, import.meta.url)), ...args], options));
  return { data, ms: Math.round(performance.now() - start) };
};
const source = run("bun", "../src/index.ts");
const built = run("node", "../dist/index.js");
assert.deepEqual(source.data, built.data, "Source and compiled CLI must agree");
const range = built.data.range;
assert.equal(range.from.hash, git("rev-parse", "--verify", "--end-of-options", `${from}^{commit}`).trim());
assert.equal(range.to.hash, git("rev-parse", "--verify", "--end-of-options", `${to}^{commit}`).trim());
const hashes = git("log", "--no-merges", "--topo-order", "--format=%H", `${range.from.hash}..${range.to.hash}`, "--").trim().split("\n").filter(Boolean);
assert.deepEqual(built.data.entries.map(entry => entry.commits[0].hash), hashes);
const preceding = new Set(git("rev-list", range.from.hash, "--").trim().split("\n"));
const paths = new Set();
let statuses = 0;
let suggestions = 0;
const cliCommits = [];
for (const entry of built.data.entries) {
  assert.equal(entry.commits.length, 1);
  const commit = entry.commits[0];
  const fields = git("show", "-s", "--no-show-signature", "--format=%s%x00%b%x00%an%x00%ae%x00%aI%x00%P", commit.hash).replace(/\n$/, "").split("\0");
  assert.equal(commit.subject, fields[0]);
  assert.equal(commit.body, fields[1]);
  assert.deepEqual(commit.author, { name: fields[2], email: fields[3] });
  assert.equal(commit.date, fields[4]);
  assert.deepEqual(commit.parents, fields[5] ? fields[5].split(" ") : []);
  const tokens = git("diff-tree", "--root", "--no-commit-id", "-r", "-z", "-M", "--name-status", commit.hash, "--").split("\0");
  const files = [];
  for (let i = 0; i < tokens.length - 1;) {
    const status = tokens[i++];
    const first = tokens[i++];
    files.push(/^[RC]/.test(status) ? { status, previousPath: first, path: tokens[i++] } : { status, path: first });
  }
  assert.deepEqual(commit.files, files);
  statuses += files.length;
  for (const file of files) {
    paths.add(file.path);
    if (file.previousPath) paths.add(file.previousPath);
  }
  if (files.some(file => file.path.startsWith("cli/"))) cliCommits.push({ hash: commit.hash, subject: commit.subject });
  assert.equal(entry.context.at.hash, range.from.hash);
  for (const file of entry.context.files) {
    suggestions += file.companions.length;
    for (const companion of file.companions) {
      for (const evidence of companion.evidence) assert.ok(preceding.has(evidence.hash), "Context must not use future commits");
    }
  }
}
assert.deepEqual(built.data.changedFiles, [...paths].sort());
assert.equal(git("status", "--porcelain"), before, "Repository status must remain unchanged");
console.log(JSON.stringify({ range, commits: hashes.length, fileStatusRecords: statuses, uniquePaths: paths.size,
  categories: built.data.entries.reduce((counts, entry) => ({ ...counts, [entry.category]: (counts[entry.category] ?? 0) + 1 }), {}),
  cliCommits, contextAnchor: range.from.hash, companionSuggestions: suggestions,
  sourceMs: source.ms, nodeMs: built.ms,
  verified: ["Bun source equals Node compiled JSON", "Git commit metadata and file statuses match", "Context evidence is at or before from", "Repository status is unchanged"],
}, null, 2));
