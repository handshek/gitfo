import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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

  console.log(`Packed CLI smoke test passed for gitfo ${version}.`);
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}
