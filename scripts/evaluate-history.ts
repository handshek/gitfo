import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { GitHistory, changedFiles } from "../src/core/history.js";
import { generateContext } from "../src/core/context.js";

const [directory, from, to, sampleCount = "25"] = process.argv.slice(2);
if (!directory || !from || !to || !/^\d+$/.test(sampleCount) || Number(sampleCount) < 1) {
  console.error("Usage: bun scripts/evaluate-history.ts <repository> <from> <to> [samples=25]");
  process.exit(1);
}

const git = await GitHistory.open(resolve(directory));
const endpoints = await git.range(from, to);
const commits = await git.commits(`${endpoints.from}..${endpoints.to}`);
const eligible = commits.filter(commit => commit.parents.length === 1 && changedFiles(commit).length >= 2 && changedFiles(commit).length <= 30);
// Deterministic sample: newest eligible changes, one source path per commit.
const samples = eligible.slice(0, Number(sampleCount));
const source = (path: string) => /\.(?:[cm]?js|tsx?|jsx|py|rs|go)$/.test(path) && !/(?:^|\/)(?:test|tests|__tests__|examples)(?:\/|$)/.test(path) && !/\.(?:test|spec)\./.test(path);
const results = [];
for (const commit of samples) {
  const paths = changedFiles(commit);
  const target = paths.find(source) ?? paths[0];
  const actual = paths.filter(path => path !== target);
  const start = performance.now();
  const context = await generateContext(git.root, { files: [resolve(git.root, target)], workingTree: false, ref: commit.parents[0] });
  const suggestions = context.files[0].companions.map(file => file.path);
  const hits = suggestions.filter(path => actual.includes(path));
  results.push({ hash: commit.hash, subject: commit.subject, historyAt: commit.parents[0], target, actualCompanions: actual,
    suggestions, hits, notObserved: suggestions.filter(path => !actual.includes(path)),
    missed: actual.filter(path => !suggestions.includes(path)), elapsedMs: Math.round(performance.now() - start),
    targetHistoryCommits: context.files[0].eligibleCommits });
}
const predicted = results.reduce((sum, row) => sum + row.suggestions.length, 0);
const actual = results.reduce((sum, row) => sum + row.actualCompanions.length, 0);
const hits = results.reduce((sum, row) => sum + row.hits.length, 0);
console.log(JSON.stringify({ schemaVersion: 1, repository: git.root, range: { from: { ref: from, hash: endpoints.from }, to: { ref: to, hash: endpoints.to } },
  methodology: "Newest eligible held-out commits; first sorted source path (or first path) is the target. Only its first-parent history is used. Other held-out paths are observed co-changes, not proven required edits. No random or exhaustive evaluation.",
  summary: { eligibleHeldOutCommits: eligible.length, samples: results.length, suggestions: predicted, observedCompanions: actual, hits,
    observedPrecision: predicted ? hits / predicted : null, observedRecall: actual ? hits / actual : null,
    samplesWithSuggestions: results.filter(row => row.suggestions.length).length,
    samplesWithHits: results.filter(row => row.hits.length).length }, results }, null, 2));
