import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { HistoryCommit } from "../types.js";

const execute = promisify(execFile);
const objectId = /^[a-f0-9]{40,64}$/;

/** Read-only Git operations shared by changelogs and history context. */
export class GitHistory {
  private constructor(readonly root: string) {}

  static async open(directory: string): Promise<GitHistory> {
    try {
      const { stdout } = await execute("git", ["-C", directory, "rev-parse", "--show-toplevel"]);
      return new GitHistory(stdout.replace(/\r?\n$/, ""));
    } catch {
      throw new Error("Not in a Git worktree. Run this command inside a repository.");
    }
  }

  async run(args: string[]): Promise<string> {
    const { stdout } = await execute("git", ["--literal-pathspecs", "-C", this.root, ...args], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_PAGER: "cat" },
    });
    return stdout;
  }

  async resolve(ref: string): Promise<string> {
    if (!ref.trim() || ref.startsWith("-")) throw new Error(`Invalid commit ref: ${JSON.stringify(ref)}.`);
    try {
      return (await this.run(["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`])).trim();
    } catch {
      throw new Error(`Cannot resolve commit ref ${JSON.stringify(ref)}. Fetch the required history or use an existing tag, branch, or commit SHA.`);
    }
  }

  async range(from: string, to: string): Promise<{ from: string; to: string }> {
    const [start, end] = await Promise.all([this.resolve(from), this.resolve(to)]);
    try {
      await this.run(["merge-base", "--is-ancestor", start, end]);
    } catch {
      throw new Error(`The starting ref must be an ancestor of the ending ref. Check the range and fetch missing history in shallow clones.`);
    }
    return { from: start, to: end };
  }

  async commits(revision: string, options: { limit?: number; skip?: number; includeMerges?: boolean } = {}): Promise<HistoryCommit[]> {
    const args = ["log", "-z", "--topo-order", "--no-show-signature", "--no-decorate", "--no-ext-diff", "--no-textconv",
      "--format=%H%x00%P%x00%an%x00%ae%x00%aI%x00%s%x00%b", "--name-status", "--find-renames", "--root"];
    if (!options.includeMerges) args.push("--no-merges");
    if (options.limit !== undefined) args.push(`--max-count=${options.limit}`);
    if (options.skip !== undefined) args.push(`--skip=${options.skip}`);
    args.push(revision, "--");
    return parseHistory(await this.run(args));
  }

  async isShallow(): Promise<boolean> {
    return (await this.run(["rev-parse", "--is-shallow-repository"])).trim() === "true";
  }

  async commitUrl(): Promise<((hash: string) => string) | undefined> {
    let remote: string;
    try { remote = (await this.run(["remote", "get-url", "origin"])).trim(); }
    catch { return undefined; }
    const match = remote.match(/^(?:https:\/\/|ssh:\/\/git@|git@)(github\.com|gitlab\.com|bitbucket\.org)(?:\/|:)([^?#]+)$/);
    if (!match) return undefined;
    const [, host, rawPath] = match;
    const path = rawPath.replace(/\.git$/, "").replace(/\/$/, "");
    if (path.split("/").length < 2 || path.split("/").some(part => !/^[\w.-]+$/.test(part))) return undefined;
    const segment = host === "gitlab.com" ? "-/commit" : host === "bitbucket.org" ? "commits" : "commit";
    return hash => `https://${host}/${path}/${segment}/${hash}`;
  }
}

function parseHistory(output: string): HistoryCommit[] {
  const tokens = output.split("\0");
  const commits: HistoryCommit[] = [];
  let cursor = 0;
  while (cursor < tokens.length - 1) {
    const hash = tokens[cursor++];
    if (!objectId.test(hash)) throw new Error("Git returned an unexpected history record.");
    const [parents, name, email, date, subject, body] = tokens.slice(cursor, cursor + 6);
    cursor += 6;
    const files: HistoryCommit["files"] = [];
    while (cursor < tokens.length - 1 && !objectId.test(tokens[cursor])) {
      const status = tokens[cursor++].replace(/^\n/, "");
      if (!status) continue;
      if (!/^[ACDMRTUXB]\d*$/.test(status)) throw new Error("Git returned an unexpected file status.");
      const firstPath = tokens[cursor++];
      if (/^[RC]/.test(status)) {
        files.push({ status, path: tokens[cursor++], previousPath: firstPath });
      } else {
        files.push({ status, path: firstPath });
      }
    }
    commits.push({ hash, parents: parents ? parents.split(" ") : [], author: { name, email }, date, subject, body, files });
  }
  return commits;
}

export function changedFiles(commit: HistoryCommit): string[] {
  return [...new Set(commit.files.flatMap(file => file.previousPath ? [file.previousPath, file.path] : [file.path]))].sort();
}
