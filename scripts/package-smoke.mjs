import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { "pack-destination": { type: "string" } } });

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
  const packed = packResult[0];
  const files = new Set(packed.files.map(file => file.path));
  const rootFiles = ["package.json", "README.md", "LICENSE", "CHANGELOG.md", "RELEASING.md"];
  if (packed.name !== packageMetadata.name || packed.version !== packageMetadata.version ||
      !["dist/index.js", ...rootFiles].every(path => files.has(path)) ||
      [...files].some(path => !path.startsWith("dist/") && !rootFiles.includes(path))) {
    throw new Error("Packed contents must contain the compiled CLI, package metadata, license, README, changelog, and release guide only.");
  }
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

  const expectFailure = (args, code, cwd = repo) => {
    const result = spawnSync(binaryPath, args, { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    const error = JSON.parse(result.stderr);
    if (result.status !== 1 || result.stdout !== "" || result.stderr.trim().split("\n").length !== 1 ||
        error.schemaVersion !== 1 || error.kind !== "error" || error.error?.code !== code || !error.error.message) {
      throw new Error(`Packed CLI did not preserve the ${code} error contract.`);
    }
  };
  expectFailure(["--format=json", "--date", "bad"], "INVALID_DATE_RANGE");
  expectFailure(["--unknown", "--format=json"], "INVALID_ARGUMENTS");
  expectFailure(["--format=json"], "NOT_GIT_REPOSITORY", smokeRoot);
  expectFailure(["changelog", "--from", "missing", "--to", "HEAD", "--format=json"], "INVALID_REF");
  expectFailure(["context", "--files", "../outside", "--format=json"], "INVALID_PATH");

  // Test package metadata at the installed CLI seam without touching this checkout.
  const installedMetadataPath = join(installRoot, "node_modules", "gitfo", "package.json");
  const installedMetadata = readFileSync(installedMetadataPath, "utf8");
  try {
    writeFileSync(installedMetadataPath, JSON.stringify({ ...JSON.parse(installedMetadata), version: "" }));
    expectFailure(["--format=json", "--version"], "PACKAGE_METADATA_ERROR");
  } finally {
    writeFileSync(installedMetadataPath, installedMetadata);
  }

  if (values["pack-destination"]) {
    const destination = resolve(values["pack-destination"]);
    mkdirSync(destination, { recursive: true });
    const artifact = join(destination, packed.filename);
    const digest = createHash("sha256").update(readFileSync(tarballPath)).digest("hex");
    copyFileSync(tarballPath, artifact);
    writeFileSync(`${artifact}.sha256`, `${digest}  ${packed.filename}\n`);
    console.log(`Verified package saved to ${artifact}.`);
  }

  console.log(`Packed CLI smoke test passed for gitfo ${version}.`);
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}
