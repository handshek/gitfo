import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPackageVersion } from "../../src/utils/version.js";
import { CLIError } from "../../src/utils/errors.js";

let tempDir: string;

describe("getPackageVersion", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitfo-version-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("reads a non-empty version from package metadata", () => {
    const metadataPath = join(tempDir, "package.json");
    writeFileSync(metadataPath, JSON.stringify({ version: "2.3.4" }));

    expect(getPackageVersion(new URL(`file://${metadataPath}`))).toBe("2.3.4");
  });

  it("fails clearly when metadata cannot be read", () => {
    expect(() =>
      getPackageVersion(new URL(`file://${join(tempDir, "missing.json")}`)),
    ).toThrow("Unable to read package version metadata");
  });

  it("fails clearly when version is missing or empty", () => {
    const metadataPath = join(tempDir, "package.json");
    writeFileSync(metadataPath, JSON.stringify({ version: "  " }));

    expect(() => getPackageVersion(new URL(`file://${metadataPath}`))).toThrow(
      "package.json must contain a non-empty string version",
    );
  });

  it("uses the package metadata code for unreadable, malformed, and missing versions", () => {
    const metadataPath = join(tempDir, "package.json");
    const url = new URL(`file://${metadataPath}`);
    for (const contents of [undefined, "{", "null", "{}", '{"version":42}']) {
      if (contents !== undefined) writeFileSync(metadataPath, contents);
      try {
        getPackageVersion(url);
        throw new Error("Expected a metadata failure.");
      } catch (error) {
        expect(error).toBeInstanceOf(CLIError);
        expect((error as CLIError).code).toBe("PACKAGE_METADATA_ERROR");
      }
    }
  });
});
