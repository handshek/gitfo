import type { Changelog } from "../types.js";

export function markdownText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/([`*_{}\[\]<>!|])/g, "\\$1").replace(/[\r\n]+/g, " ");
}

export function formatChangelog(changelog: Changelog): string {
  const lines = [`# Changelog: ${markdownText(changelog.range.from.ref)} → ${markdownText(changelog.range.to.ref)}`, ""];
  const categories = { breaking: "Breaking changes", features: "Features", fixes: "Fixes", other: "Other changes" } as const;
  for (const [category, title] of Object.entries(categories)) {
    const entries = changelog.entries.filter(entry => entry.category === category);
    if (!entries.length) continue;
    lines.push(`## ${title}`, "");
    for (const entry of entries) {
      const commit = entry.commits[0];
      const reference = commit.url ? `[${commit.hash.slice(0, 7)}](${commit.url})` : `\`${commit.hash.slice(0, 7)}\``;
      lines.push(`- ${entry.scope ? `**${markdownText(entry.scope)}:** ` : ""}${markdownText(entry.description)} (${reference})`);
      if (commit.body.trim()) lines.push(...commit.body.trimEnd().split("\n").map(line => `  > ${markdownText(line)}`));
      if (entry.context) {
        lines.push(`  > Historical context at ${markdownText(entry.context.at.ref)} (${entry.context.at.hash.slice(0, 7)}), advisory only:`);
        for (const file of entry.context.files) {
          const companions = file.companions.map(companion => `${markdownText(JSON.stringify(companion.path))} (${companion.sharedCommits}/${file.eligibleCommits}; evidence: ${companion.evidence.map(item => item.hash.slice(0, 7)).join(", ")})`).join("; ");
          lines.push(`  > ${markdownText(JSON.stringify(file.path))}: ${companions || "no companion meets the minimum of 3 shared commits"}.`);
        }
        lines.push(...entry.context.limitations.map(note => `  > ${markdownText(note)}`));
      }
    }
    lines.push("");
  }
  if (!changelog.entries.length) lines.push("No non-merge commits in this range.", "");
  lines.push(...changelog.limitations.map(note => `> ${markdownText(note)}`));
  return lines.join("\n");
}
