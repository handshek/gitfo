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
    }
    lines.push("");
  }
  if (!changelog.entries.length) lines.push("No non-merge commits in this range.", "");
  lines.push(...changelog.limitations.map(note => `> ${markdownText(note)}`));
  return lines.join("\n");
}
