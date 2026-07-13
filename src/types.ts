export type RiskLevel = 'low' | 'medium' | 'high';

export type CleanerScope = 'filesystem' | 'git-repo' | 'global';
/** CLI/config scan scope. Defaults to filesystem-only for path-scoped safety. */
export type ScanScope = 'filesystem' | 'git' | 'global' | 'all';
export type FilesystemTarget = 'directory' | 'file';
export type FindingKind = 'path' | 'git-branch' | 'docker-resource';
export type DockerResourceType = 'image' | 'container' | 'volume';

export interface Finding {
  kind: FindingKind;
  cleaner: string;
  /** Display id: filesystem path, branch name, or docker id/name */
  path: string;
  sizeBytes: number;
  risk: RiskLevel;
  description: string;
  repoRoot?: string;
  dockerType?: DockerResourceType;
  resourceId?: string;
}

interface CleanerBase {
  name: string;
  description: string;
  risk: RiskLevel;
}

/** Matches directories or files during filesystem walk. */
export interface FilesystemCleaner extends CleanerBase {
  scope: 'filesystem';
  target: FilesystemTarget;
  detect: (entryPath: string) => boolean | Promise<boolean>;
  skipChildren?: boolean;
  /** When true, `minAgeDays` in scan options can skip recently modified matches. */
  ageFilterable?: boolean;
}

export interface GitScanContext {
  protectedBranches?: string[];
  gitFetch?: boolean;
}

/** Runs once per discovered Git repository root. */
export interface GitRepoCleaner extends CleanerBase {
  scope: 'git-repo';
  requiresCli: readonly ['git'];
  scanRepo: (repoRoot: string, context?: GitScanContext) => Promise<Finding[]>;
}

/** Runs once per scan against the local machine (e.g. Docker daemon). */
export interface GlobalCleaner extends CleanerBase {
  scope: 'global';
  requiresCli: readonly string[];
  scanGlobal: () => Promise<Finding[]>;
}

export type Cleaner = FilesystemCleaner | GitRepoCleaner | GlobalCleaner;

export interface JanitorConfig {
  ignore: string[];
  cleaners: string[];
  /** Scan scope when CLI `--scope` is omitted. Defaults to filesystem. */
  scope: ScanScope;
  /** Skip age-filterable cleaners when modified more recently than this many days. */
  minAgeDays: number;
  /** Extra local branch names that must never be deleted by git-stale-branches. */
  protectedBranches: string[];
  /** When true, run `git fetch --prune` before scanning merged branches. */
  gitFetch: boolean;
}

export interface ScanOptions {
  rootPath: string;
  cleaners: Cleaner[];
  ignore: string[];
  scope?: ScanScope;
  minAgeDays?: number;
  protectedBranches?: string[];
  gitFetch?: boolean;
  onProgress?: (message: string) => void;
  onWarning?: (message: string) => void;
  verbose?: boolean;
}

export interface ScanResult {
  findings: Finding[];
  totalBytes: number;
  scannedDirs: number;
  gitRepos: number;
  skippedCleaners: string[];
}

export interface ConfirmDeletionDetails {
  totalBytes: number;
  count: number;
  mediumRiskCount: number;
  highRiskCount: number;
}

export type ConfirmDeletionFn = (details: ConfirmDeletionDetails) => Promise<boolean>;

export interface CleanOptions {
  findings: Finding[];
  force: boolean;
  dryRun: boolean;
  /** Required when `force` is false and `dryRun` is false. Library callers inject their own prompt. */
  confirm?: ConfirmDeletionFn;
  /**
   * When set, path findings and git repo roots must resolve under (or equal) one of these roots.
   * Empty array is fail-closed. Omit to skip bound checks (library callers only).
   */
  allowedRoots?: string[];
  onDeleteError?: (itemPath: string, error: string) => void;
}

export interface CleanResult {
  deleted: string[];
  failed: Array<{ path: string; error: string }>;
  bytesFreed: number;
  cancelled: boolean;
  dryRun: boolean;
  /** Populated when dryRun is true: paths that would be removed. */
  wouldDelete: string[];
}

export interface ConfigValidationWarning {
  field: string;
  message: string;
}

/** Stable JSON envelope for `dj scan --json` and `dj clean --json`. */
export interface JsonCommandResult {
  version: string;
  command: 'scan' | 'clean' | 'list-cleaners';
  path?: string;
  /** Canonical cleaner ids active for scan/clean commands. */
  cleaners?: string[];
  scope?: ScanScope;
  minAgeDays?: number;
  /** Populated by `list-cleaners --json`. */
  listedCleaners?: Array<{
    name: string;
    description: string;
    risk: RiskLevel;
    scope: CleanerScope;
    target?: FilesystemTarget;
    requiresCli: string[];
  }>;
  findings?: Finding[];
  totalBytes?: number;
  scannedDirs?: number;
  gitRepos?: number;
  skippedCleaners?: string[];
  configWarnings?: ConfigValidationWarning[];
  warnings?: string[];
  clean?: {
    dryRun: boolean;
    cancelled: boolean;
    deleted: string[];
    failed: Array<{ path: string; error: string }>;
    bytesFreed: number;
    wouldDelete: string[];
  };
  error?: string;
}
