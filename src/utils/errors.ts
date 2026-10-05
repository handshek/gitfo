export type CLIErrorCode =
  | "INVALID_ARGUMENTS"
  | "INVALID_DATE_RANGE"
  | "NOT_GIT_REPOSITORY"
  | "INVALID_REF"
  | "INVALID_COMMIT_RANGE"
  | "INVALID_PATH"
  | "PACKAGE_METADATA_ERROR"
  | "OPERATION_FAILED";

export interface JSONError {
  schemaVersion: 1;
  kind: "error";
  error: { code: CLIErrorCode; message: string };
}

export class CLIError extends Error {
  constructor(readonly code: CLIErrorCode, message: string) {
    super(message);
    this.name = "CLIError";
  }
}

/** One formatter for all top-level failures; callers keep stdout for results. */
export function formatCLIError(error: unknown, json: boolean): string {
  const message = error instanceof Error ? error.message : "An unexpected operation failure occurred.";
  if (!json) return `Error: ${message}`;
  const result: JSONError = {
    schemaVersion: 1,
    kind: "error",
    error: { code: error instanceof CLIError ? error.code : "OPERATION_FAILED", message },
  };
  return JSON.stringify(result);
}
