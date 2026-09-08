import { readFileSync } from "fs";
import { fileURLToPath } from "url";

interface PackageMetadata {
  version?: unknown;
}

const packageMetadataUrl = new URL("../../package.json", import.meta.url);

export function getPackageVersion(
  metadataUrl: URL = packageMetadataUrl,
): string {
  let metadata: PackageMetadata;

  try {
    metadata = JSON.parse(
      readFileSync(fileURLToPath(metadataUrl), "utf8"),
    ) as PackageMetadata;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read package version metadata: ${reason}`);
  }

  if (typeof metadata.version !== "string" || metadata.version.trim() === "") {
    throw new Error(
      "Unable to read package version metadata: package.json must contain a non-empty string version.",
    );
  }

  return metadata.version;
}
