import { describe, expect, it } from "vitest";
import { requestsJSON } from "../../src/cli.js";
import { CLIError, formatCLIError } from "../../src/utils/errors.js";

describe("CLI failure formatting", () => {
  it("serializes known and unexpected failures without stacks", () => {
    expect(JSON.parse(formatCLIError(new CLIError("INVALID_ARGUMENTS", "Choose an option."), true)))
      .toEqual({ schemaVersion: 1, kind: "error", error: { code: "INVALID_ARGUMENTS", message: "Choose an option." } });
    expect(JSON.parse(formatCLIError(new Error("Git failed.\nFetch history."), true)))
      .toEqual({ schemaVersion: 1, kind: "error", error: { code: "OPERATION_FAILED", message: "Git failed.\nFetch history." } });
    expect(formatCLIError(new Error("Git failed."), false)).toBe("Error: Git failed.");
    expect(JSON.parse(formatCLIError(null, true)).error.code).toBe("OPERATION_FAILED");
  });

  it("detects JSON intent even before parsing succeeds", () => {
    for (const args of [
      ["--unknown", "--format=json"],
      ["-vt", "--format", "json"],
      ["-vaSomeone", "--format=json"],
      ["--scan", "one", "two", "--date", "bad", "--format=json"],
      ["changelog", "--from", "missing", "--format=json"],
      ["context", "--files", "one", "two", "--format=json"],
      ["changelog", "--format", "markdown", "--format", "json"],
    ]) expect(requestsJSON(args)).toBe(true);
  });

  it("does not interpret consumed values or literal arguments as format options", () => {
    for (const args of [
      ["--author", "--format=json"],
      ["-a--format=json"],
      ["-va--format=json"],
      ["--scan", "--format=json"],
      ["--unknown", "--", "--format=json"],
      ["context", "--files", "--format=json"],
      ["changelog", "--format", "json", "--format", "markdown"],
    ]) expect(requestsJSON(args)).toBe(false);
  });
});
