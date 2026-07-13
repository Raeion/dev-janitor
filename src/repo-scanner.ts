import type { Finding, Cleaner } from './types.js';
import { isNestedRepoRoot } from './utils/paths.js';
import { partitionByCliAvailability, type CleanerAvailabilityOptions } from './utils/cleaner-availability.js';
import { gitRepoCleaners } from './cleaners/type-guards.js';
import type { ScanCallbacks } from './utils/scan-callbacks.js';

export interface RepoScanOptions extends ScanCallbacks {
  repoRoots: string[];
  cleaners: Cleaner[];
  protectedBranches?: string[];
  gitFetch?: boolean;
}

export interface RepoScanResult {
  findings: Finding[];
  scannedRepos: number;
  skippedCleaners: string[];
}

function dedupeRepoRoots(repoRoots: string[]): string[] {
  const sorted = [...repoRoots].sort((a, b) => a.length - b.length);
  const kept: string[] = [];

  for (const repo of sorted) {
    const nested = kept.some((parent) => isNestedRepoRoot(repo, parent));
    if (!nested) {
      kept.push(repo);
    }
  }

  return kept;
}

/** Run git-repo scoped cleaners for each discovered repository. */
export async function scanRepos(options: RepoScanOptions): Promise<RepoScanResult> {
  const cleaners = gitRepoCleaners(options.cleaners);
  const availabilityOptions: CleanerAvailabilityOptions = {};
  if (options.onWarning) {
    availabilityOptions.onWarning = options.onWarning;
  }
  if (options.verbose !== undefined) {
    availabilityOptions.verbose = options.verbose;
  }
  const { available: availableNames, skipped } = await partitionByCliAvailability(
    cleaners,
    availabilityOptions,
  );
  const available = cleaners.filter((cleaner) => availableNames.includes(cleaner));

  const repoRoots = dedupeRepoRoots(options.repoRoots);
  const findings: Finding[] = [];
  const gitContext =
    options.protectedBranches || options.gitFetch
      ? {
          ...(options.protectedBranches ? { protectedBranches: options.protectedBranches } : {}),
          ...(options.gitFetch ? { gitFetch: options.gitFetch } : {}),
        }
      : undefined;

  for (const repoRoot of repoRoots) {
    options.onProgress?.(`Scanning git repo ${repoRoot}`);

    for (const cleaner of available) {
      try {
        const repoFindings = await cleaner.scanRepo(repoRoot, gitContext);
        findings.push(...repoFindings);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        options.onWarning?.(`Cleaner "${cleaner.name}" failed for ${repoRoot}: ${message}`);
      }
    }
  }

  return {
    findings,
    scannedRepos: repoRoots.length,
    skippedCleaners: skipped,
  };
}
