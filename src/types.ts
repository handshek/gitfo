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

export interface RepoStats {
  name: string;
  path: string;
  commits: CommitInfo[];
  totalCommits: number;
  totalFilesChanged: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  netChange: number;
}

export interface MultiRepoStats {
  repositories: RepoStats[];
  totalRepositories: number;
  totalCommits: number;
  totalFilesChanged: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  netChange: number;
}
