import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { GlobalCleaner, Finding } from '../types.js';
import { measureTreeBytes } from '../utils/tree-size.js';

export const PACKAGE_CACHE_CANDIDATES = [
  {
    relative: ['.npm', '_cacache'],
    description: 'npm package cache',
  },
  {
    relative: ['.local', 'share', 'pnpm', 'store'],
    description: 'pnpm store (Linux layout)',
  },
  {
    relative: ['Library', 'pnpm', 'store'],
    description: 'pnpm store (macOS layout)',
  },
  {
    relative: ['AppData', 'Local', 'pnpm', 'store'],
    description: 'pnpm store (Windows layout)',
  },
  {
    relative: ['.pnpm-store'],
    description: 'legacy pnpm store',
  },
] as const;

export function packageCachePathsForHome(home: string): Array<{ path: string; description: string }> {
  return PACKAGE_CACHE_CANDIDATES.map((candidate) => ({
    path: path.join(home, ...candidate.relative),
    description: candidate.description,
  }));
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function cacheFinding(
  cachePath: string,
  description: string,
): Promise<Finding | undefined> {
  if (!(await pathExists(cachePath))) {
    return undefined;
  }

  const sizeBytes = await measureTreeBytes(cachePath);
  return {
    kind: 'path',
    cleaner: 'package-caches',
    path: cachePath,
    sizeBytes,
    risk: 'medium',
    description,
  };
}

export async function scanPackageCaches(home: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const candidate of packageCachePathsForHome(home)) {
    const finding = await cacheFinding(candidate.path, candidate.description);
    if (finding) {
      findings.push(finding);
    }
  }
  return findings;
}

export const packageCachesCleaner: GlobalCleaner = {
  name: 'package-caches',
  description: 'Removes global npm and pnpm package caches under your home directory',
  risk: 'medium',
  scope: 'global',
  requiresCli: [],
  async scanGlobal(): Promise<Finding[]> {
    return scanPackageCaches(homedir());
  },
};
