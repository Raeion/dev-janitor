import type { ScanOptions, ScanResult } from './types.js';
import { scanFilesystem } from './scanner.js';
import { scanRepos } from './repo-scanner.js';
import { scanGlobal } from './global-scanner.js';
import { pruneNestedFindings } from './execution.js';
import { pickScanCallbacks } from './utils/scan-callbacks.js';
import { filterCleanersByScope } from './utils/scope.js';

/**
 * Orchestrate filesystem, git-repo, and global cleaner scans.
 * Path findings nested under another finding are pruned before returning.
 * Scope defaults to filesystem-only so global/git cleaners do not run unless requested.
 */
export async function scan(options: ScanOptions): Promise<ScanResult> {
  const callbacks = pickScanCallbacks(options);
  const scope = options.scope ?? 'filesystem';
  const cleaners = filterCleanersByScope(options.cleaners, scope);

  const fsOptions: Parameters<typeof scanFilesystem>[0] = {
    rootPath: options.rootPath,
    cleaners,
    ignore: options.ignore,
  };
  if (options.onProgress) {
    fsOptions.onProgress = options.onProgress;
  }
  if (options.minAgeDays !== undefined) {
    fsOptions.minAgeDays = options.minAgeDays;
  }

  const fsResult =
    scope === 'global'
      ? { findings: [], scannedDirs: 0, gitRepoRoots: [] as string[] }
      : await scanFilesystem(fsOptions);

  let repoFindings: Awaited<ReturnType<typeof scanRepos>> = {
    findings: [],
    scannedRepos: 0,
    skippedCleaners: [],
  };
  if (scope === 'git' || scope === 'all') {
    const repoOptions: Parameters<typeof scanRepos>[0] = {
      repoRoots: fsResult.gitRepoRoots,
      cleaners,
      ...callbacks,
    };
    if (options.protectedBranches) {
      repoOptions.protectedBranches = options.protectedBranches;
    }
    if (options.gitFetch) {
      repoOptions.gitFetch = options.gitFetch;
    }
    repoFindings = await scanRepos(repoOptions);
  }

  let globalFindings: Awaited<ReturnType<typeof scanGlobal>> = {
    findings: [],
    skippedCleaners: [],
  };
  if (scope === 'global' || scope === 'all') {
    globalFindings = await scanGlobal({
      cleaners,
      ...callbacks,
    });
  }

  const merged = [
    ...fsResult.findings,
    ...repoFindings.findings,
    ...globalFindings.findings,
  ];

  const findings = pruneNestedFindings(merged).sort((a, b) => b.sizeBytes - a.sizeBytes);
  const totalBytes = findings.reduce((sum, f) => sum + f.sizeBytes, 0);
  const skippedCleaners = [
    ...new Set([...repoFindings.skippedCleaners, ...globalFindings.skippedCleaners]),
  ];

  return {
    findings,
    totalBytes,
    scannedDirs: fsResult.scannedDirs,
    gitRepos: repoFindings.scannedRepos,
    skippedCleaners,
  };
}
