import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageMetadata = JSON.parse(readFileSync("package.json", "utf8"));
const smokeRoot = mkdtempSync(join(tmpdir(), "gitfo-package-smoke-"));
const installRoot = join(smokeRoot, "install");
const npmEnvironment = {
  ...process.env,
  npm_config_cache: join(smokeRoot, "npm-cache"),
};

try {
  const packResult = JSON.parse(
    execFileSync(
      "npm",
      ["pack", "--json", "--pack-destination", smokeRoot],
      { encoding: "utf8", env: npmEnvironment },
    ),
  );
  const tarballPath = join(smokeRoot, packResult[0].filename);

  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--prefix", installRoot, tarballPath],
    { stdio: "inherit", env: npmEnvironment },
  );

  const binaryName = process.platform === "win32" ? "gitfo.cmd" : "gitfo";
  const binaryPath = join(installRoot, "node_modules", ".bin", binaryName);
  const version = execFileSync(binaryPath, ["--version"], {
    encoding: "utf8",
  }).trim();
  const help = execFileSync(binaryPath, ["--help"], { encoding: "utf8" });

  if (version !== packageMetadata.version) {
    throw new Error(
      `Packed CLI version ${version} does not match package version ${packageMetadata.version}.`,
    );
  }

  if (!help.includes("Usage: gitfo")) {
    throw new Error("Packed CLI help output is missing its usage header.");
  }

  const repo = join(smokeRoot, "repository");
  mkdirSync(repo);
  const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: "ignore" });
  git("init");
  git("config", "user.name", "Package Smoke");
  git("config", "user.email", "smoke@example.com");
  writeFileSync(join(repo, "file.txt"), "initial\n");
  git("add", "file.txt");
  git("commit", "-m", "Initial snapshot");
  git("tag", "start");
  writeFileSync(join(repo, "file.txt"), "changed\n");
  git("add", "file.txt");
  git("commit", "-m", "feat: packed changelog");
  const invoke = (...args) => execFileSync(binaryPath, args, { cwd: repo, encoding: "utf8" });
  const changelog = JSON.parse(invoke("changelog", "--from", "start", "--to", "HEAD", "--with-context", "--format", "json"));
  const context = JSON.parse(invoke("context", "--files", "file.txt", "--format", "json"));
  if (changelog.schemaVersion !== 1 || changelog.entries[0]?.description !== "packed changelog" || !changelog.entries[0]?.context || context.files[0]?.eligibleCommits !== 1) {
    throw new Error("Packed changelog/context commands did not produce expected evidence.");
  }
  if (!invoke("changelog", "--from", "start", "--to", "HEAD").startsWith("# Changelog:")) {
    throw new Error("Packed Markdown changelog output is missing its header.");
  }

  console.log(`Packed CLI smoke test passed for gitfo ${version}.`);
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}
