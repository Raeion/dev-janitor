import { readdir, stat, lstat } from 'node:fs/promises';
import path from 'node:path';
import type { Dirent } from 'node:fs';
import micromatch from 'micromatch';
import type { Cleaner, FilesystemCleaner, Finding } from './types.js';
import { pathFinding } from './utils/findings.js';
import { usableIgnorePatterns } from './utils/ignore-patterns.js';
import { mapWithConcurrency } from './utils/parallel.js';
import { measureTreeBytes } from './utils/tree-size.js';
import {
  directoryCleaners,
  fileCleaners,
  filesystemCleaners,
} from './cleaners/type-guards.js';

const WALK_CONCURRENCY = 8;

export interface FilesystemScanOptions {
  rootPath: string;
  cleaners: Cleaner[];
  ignore: string[];
  minAgeDays?: number;
  onProgress?: (message: string) => void;
}

export interface FilesystemScanResult {
  findings: Finding[];
  scannedDirs: number;
  gitRepoRoots: string[];
}

function isIgnored(absolutePath: string, rootPath: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  const relative = path.relative(rootPath, absolutePath).split(path.sep).join('/');
  if (relative === '' || relative.startsWith('..')) {
    return false;
  }

  return micromatch.isMatch(relative, patterns, { dot: true });
}

async function detectMatch(cleaner: FilesystemCleaner, entryPath: string): Promise<boolean> {
  return Boolean(await cleaner.detect(entryPath));
}

async function isOldEnough(entryPath: string, minAgeDays: number): Promise<boolean> {
  try {
    const info = await lstat(entryPath);
    const ageMs = Date.now() - info.mtimeMs;
    return ageMs >= minAgeDays * 86_400_000;
  } catch {
    return false;
  }
}

async function passesAgeFilter(
  cleaner: FilesystemCleaner,
  entryPath: string,
  minAgeDays: number | undefined,
): Promise<boolean> {
  if (!cleaner.ageFilterable || minAgeDays === undefined || minAgeDays <= 0) {
    return true;
  }
  return isOldEnough(entryPath, minAgeDays);
}

async function addFinding(
  findings: Finding[],
  cleaner: FilesystemCleaner,
  entryPath: string,
  sizeBytes: number,
): Promise<void> {
  const duplicate = findings.some(
    (f) => f.path === entryPath && f.cleaner === cleaner.name,
  );
  if (duplicate) {
    return;
  }

  findings.push(
    pathFinding({
      cleaner: cleaner.name,
      path: entryPath,
      sizeBytes,
      risk: cleaner.risk,
      description: cleaner.description,
    }),
  );
}

function recordGitRepo(gitRepoRoots: string[], repoRoot: string): void {
  if (!gitRepoRoots.includes(repoRoot)) {
    gitRepoRoots.push(repoRoot);
  }
}

/**
 * Recursively walk `rootPath`, run filesystem cleaners, discover git repos.
 * Supports `.git` directories and submodule `.git` files.
 */
export async function scanFilesystem(
  options: FilesystemScanOptions,
): Promise<FilesystemScanResult> {
  const rootPath = path.resolve(options.rootPath);
  const ignorePatterns = usableIgnorePatterns(options.ignore);
  const fsCleaners = filesystemCleaners(options.cleaners);
  const dirCleaners = directoryCleaners(fsCleaners);
  const fileCleanersList = fileCleaners(fsCleaners);
  const findings: Finding[] = [];
  const gitRepoRoots: string[] = [];
  let scannedDirs = 0;
  const minAgeDays = options.minAgeDays;

  let rootStat;
  try {
    rootStat = await stat(rootPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot access path "${rootPath}": ${message}`, { cause: error });
  }

  if (!rootStat.isDirectory()) {
    throw new Error(`Path is not a directory: ${rootPath}`);
  }

  async function walk(currentPath: string): Promise<number> {
    if (isIgnored(currentPath, rootPath, ignorePatterns)) {
      return 0;
    }

    scannedDirs += 1;
    options.onProgress?.(`Scanning ${currentPath}`);

    for (const cleaner of dirCleaners) {
      const matched = await detectMatch(cleaner, currentPath);
      if (!matched) {
        continue;
      }

      if (!(await passesAgeFilter(cleaner, currentPath, minAgeDays))) {
        continue;
      }

      const sizeBytes = await measureTreeBytes(currentPath);
      await addFinding(findings, cleaner, currentPath, sizeBytes);

      if (cleaner.skipChildren) {
        return sizeBytes;
      }
    }

    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error
          ? String((error as NodeJS.ErrnoException).code)
          : '';
      if (code === 'EACCES' || code === 'EPERM') {
        options.onProgress?.(`Skipped (permission denied): ${currentPath}`);
        return 0;
      }
      throw error;
    }

    let subtreeBytes = 0;
    const directoryEntries: Array<{ entry: Dirent; childPath: string }> = [];

    for (const entry of entries) {
      const childPath = path.join(currentPath, entry.name);

      if (entry.name === '.git' && !entry.isSymbolicLink()) {
        recordGitRepo(gitRepoRoots, currentPath);
        continue;
      }

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        directoryEntries.push({ entry, childPath });
        continue;
      }

      if (entry.isFile() && fileCleanersList.length > 0) {
        if (isIgnored(childPath, rootPath, ignorePatterns)) {
          continue;
        }

        let sizeBytes = 0;
        try {
          const info = await lstat(childPath);
          sizeBytes = info.size;
        } catch {
          // keep zero size when file is inaccessible
        }

        subtreeBytes += sizeBytes;

        for (const cleaner of fileCleanersList) {
          const matched = await detectMatch(cleaner, childPath);
          if (!matched) {
            continue;
          }

          if (!(await passesAgeFilter(cleaner, childPath, minAgeDays))) {
            continue;
          }

          await addFinding(findings, cleaner, childPath, sizeBytes);
        }
      }
    }

    if (directoryEntries.length > 0) {
      const childSizes = await mapWithConcurrency(
        directoryEntries,
        async ({ childPath }) => walk(childPath),
        { concurrency: WALK_CONCURRENCY },
      );
      subtreeBytes += childSizes.reduce((sum, size) => sum + size, 0);
    }

    return subtreeBytes;
  }

  await walk(rootPath);

  return { findings, scannedDirs, gitRepoRoots };
}
