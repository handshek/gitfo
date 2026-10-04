export interface CLIOptions {
  scan?: string[];
  date?: string;
  since?: string;
  until?: string;
  today?: boolean;
  yesterday?: boolean;
  thisWeek?: boolean;
  lastWeek?: boolean;
  week?: boolean;
  author?: string;
  format?: "table" | "json" | "summary";
  includeMerges?: boolean;
  verbose?: boolean;
}

export interface ChangelogOptions {
  command: "changelog";
  from: string;
  to: string;
  format: "markdown" | "json";
  withContext: boolean;
}

export interface ContextOptions {
  command: "context";
  files?: string[];
  workingTree: boolean;
  ref: string;
  format: "markdown" | "json";
}

export interface HistoryCommit {
  hash: string;
  parents: string[];
  author: { name: string; email: string };
  date: string;
  subject: string;
  body: string;
  files: { status: string; path: string; previousPath?: string }[];
  url?: string;
}

export interface ChangelogEntry {
  category: "breaking" | "features" | "fixes" | "other";
  description: string;
  scope?: string;
  breaking: boolean;
  commits: HistoryCommit[];
  context?: HistoryContext;
}

export interface Changelog {
  schemaVersion: 1;
  kind: "changelog";
  range: { from: { ref: string; hash: string }; to: { ref: string; hash: string } };
  entries: ChangelogEntry[];
  changedFiles: string[];
  limitations: string[];
}

export interface FileContext {
  path: string;
  eligibleCommits: number;
  companions: {
    path: string;
    sharedCommits: number;
    frequency: number;
    evidence: { hash: string; subject: string; url?: string }[];
  }[];
}

export interface HistoryContext {
  schemaVersion: 1;
  kind: "context";
  at: { ref: string; hash: string };
  source: "files" | "working-tree";
  files: FileContext[];
  history: {
    eligibleCommits: number;
    examinedCommits: number;
    excluded: { merges: number; roots: number; largeChangesets: number };
    limits: { commits: number; filesPerCommit: number; minSharedCommits: number; companions: number; evidence: number };
    windowLimitReached: boolean;
    shallow: boolean;
  };
  limitations: string[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
}

export interface CommitAnalysisFailure {
  hash: string;
  message: string;
  reason: string;
}

export interface RepoStats {
  name: string;
  path: string;
  commits: CommitInfo[];
  analysisFailures: CommitAnalysisFailure[];
  totalCommits: number;
  totalFilesChanged: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  netChange: number;
}

export interface RepoAnalysisFailure {
  path: string;
  message: string;
}

export interface MultiRepoStats {
  repositories: RepoStats[];
  failedRepositories: RepoAnalysisFailure[];
  totalRepositories: number;
  totalFailedRepositories: number;
  totalCommits: number;
  totalFilesChanged: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  netChange: number;
}
