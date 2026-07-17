import { execFileSync } from "child_process";
import simpleGit, { SimpleGit } from "simple-git";

export function isGitRepo(path: string): boolean {
  try {
    const output = execFileSync(
      "git",
      ["-C", path, "rev-parse", "--is-inside-work-tree"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    return output.trim() === "true";
  } catch {
    return false;
  }
}

export async function getGitUserEmail(path?: string): Promise<string | null> {
  try {
    const git: SimpleGit = path ? simpleGit(path) : simpleGit();
    const config = await git.getConfig("user.email");
    return config.value || null;
  } catch (error) {
    return null;
  }
}

export async function getGitUserName(path?: string): Promise<string | null> {
  try {
    const git: SimpleGit = path ? simpleGit(path) : simpleGit();
    const config = await git.getConfig("user.name");
    return config.value || null;
  } catch (error) {
    return null;
  }
}
