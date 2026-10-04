import type { HistoryContext } from "../types.js";
import { markdownText } from "./changelog.js";

export function formatContext(context: HistoryContext): string {
  const lines = [`# History context at ${markdownText(context.at.ref)} (${context.at.hash.slice(0, 7)})`, "",
    `Analyzed ${context.history.eligibleCommits} eligible commits; excluded ${context.history.excluded.merges} merges, ${context.history.excluded.roots} roots, and ${context.history.excluded.largeChangesets} large changesets.`, ""];
  for (const file of context.files) {
    lines.push(`## ${markdownText(JSON.stringify(file.path))}`, "", `${file.eligibleCommits} eligible commits touched this path.`, "");
    if (!file.companions.length) lines.push("No companion meets the minimum of 3 shared commits.");
    for (const companion of file.companions) {
      const evidence = companion.evidence.map(commit => commit.url ? `[${commit.hash.slice(0, 7)}](${commit.url})` : `\`${commit.hash.slice(0, 7)}\``).join(", ");
      lines.push(`- ${markdownText(JSON.stringify(companion.path))}: ${companion.sharedCommits}/${file.eligibleCommits} shared commits (${Math.round(companion.frequency * 100)}%). Evidence: ${evidence}.`);
    }
    lines.push("");
  }
  lines.push(...context.limitations.map(note => `> ${markdownText(note)}`));
  return lines.join("\n");
}
