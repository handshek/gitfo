import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export function git(directory: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
}

export function repository(): string {
  const directory = mkdtempSync(join(tmpdir(), "gitfo-history-"));
  git(directory, "init", "-b", "main");
  git(directory, "config", "user.name", "Test User");
  git(directory, "config", "user.email", "test@example.com");
  commit(directory, "Initial snapshot", { "initial.txt": "initial\n" });
  git(directory, "tag", "start");
  return directory;
}

let sequence = 0;
export function commit(directory: string, message: string, files: Record<string, string> = {}): string {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), `${content}\n${sequence++}\n`);
  }
  git(directory, "add", "--all");
  git(directory, "commit", "--allow-empty", "-m", message);
  return git(directory, "rev-parse", "HEAD");
}

const cli = resolve("src/index.ts");
export function runCli(directory: string, ...args: string[]): string {
  return execFileSync("bun", [cli, ...args], { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NO_COLOR: "1" } });
}
