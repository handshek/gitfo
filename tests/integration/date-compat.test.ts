import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";

const cli = resolve("src/index.ts");
let directory: string;
const env = { ...process.env, TZ: "UTC", NO_COLOR: "1" };

function git(...args: string[]): string {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
    cwd: directory, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "gitfo-date-compat-")); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

it.each([
  { version: "git version 2.37.0 (Apple Git-test)", modern: true },
  { version: "git version 2.37.0.windows.1", modern: true },
  { version: "git version 2.36.0", modern: false },
  { version: "unrecognized vendor version", modern: false },
])("preserves date results with $version and bounds modern Git output", ({ version, modern }) => {
  git("init");
  const count = modern ? 32 : version.includes("2.36") ? 2000 : 2100;
  let history = "";
  for (let index = 0; index < count; index++) {
    const timestamp = index === 30 ? 1770033600 : 1769947200;
    const message = `commit ${index}`;
    history += `commit refs/heads/main
committer Compatibility Test <compat@example.com> ${timestamp} +0000
data ${message.length}
${message}

`;
  }
  execFileSync("git", ["fast-import", "--quiet"], { cwd: directory, input: history, stdio: ["pipe", "ignore", "pipe"] });
  git("symbolic-ref", "HEAD", "refs/heads/main");
  const root = git("rev-list", "--max-parents=0", "HEAD");
  const bin = join(directory, "bin");
  mkdirSync(bin);
  const trace = join(directory, "log-bytes.txt");
  const wrapper = join(bin, "git");
  writeFileSync(wrapper, `#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const { appendFileSync, existsSync } = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === '--version') {
  process.stdout.write(${JSON.stringify(version + "\n")});
  process.exit(0);
}
if (!${modern} && args.some(arg => arg.startsWith('--since-as-filter'))) {
  process.stderr.write('unsupported option');
  process.exit(129);
}
const result = spawnSync('git', args, { env: { ...process.env, PATH: ${JSON.stringify(process.env.PATH)} }, encoding: 'utf8' });
if (!${modern} && args[0] === 'log' && !existsSync(${JSON.stringify(trace)})) {
  spawnSync('git', ['update-ref', 'HEAD', ${JSON.stringify(root)}], { env: { ...process.env, PATH: ${JSON.stringify(process.env.PATH)} } });
}
if (args[0] === 'log') appendFileSync(${JSON.stringify(trace)}, String(Buffer.byteLength(result.stdout)) + '\\n');
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
`);
  chmodSync(wrapper, 0o755);
  const result = spawnSync("bun", [cli, "--date", "2026-02-02", "--author", "Compatibility Test", "--format", "json"], {
    cwd: directory, env: { ...env, PATH: `${bin}${delimiter}${process.env.PATH}` }, encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toMatchObject({ totalCommits: 1, totalLinesAdded: 0, analysisFailures: [] });
  expect(JSON.parse(result.stdout).commits[0].message).toBe("commit 30");
  const sizes = readFileSync(trace, "utf8").trim().split("\n").map(Number);
  expect(Math.max(...sizes)).toBeLessThan(modern ? 1024 : 200_000);
});
