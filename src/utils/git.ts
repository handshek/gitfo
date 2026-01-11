import { existsSync } from "fs";
import { join } from "path";
import simpleGit, { SimpleGit } from "simple-git";

export function isGitRepo(path: string): boolean {
  const gitDir = join(path, ".git");
  return existsSync(gitDir);
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
