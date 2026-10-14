import { mkdtempSync, realpathSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { expect, it, vi } from "vitest";
import { findGitRepos } from "../../src/core/scanner.js";

const gitRootOutput = vi.hoisted(() => vi.fn());
vi.mock("child_process", () => ({
  execFileSync: (_file: string, args: string[]) => {
    if (args.includes("--show-toplevel")) return gitRootOutput();
    throw new Error("Path is not ignored");
  },
}));

it("ignores an empty Git root response instead of adding the current directory", () => {
  const directory = mkdtempSync(join(tmpdir(), "gitfo-scanner-compat-"));
  try {
    gitRootOutput.mockReturnValue("");
    expect(findGitRepos([directory])).toEqual([]);
    gitRootOutput.mockReturnValue(`${directory}\n`);
    expect(findGitRepos([directory])).toEqual([realpathSync(directory)]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
