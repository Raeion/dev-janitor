import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { mapWithConcurrency } from './parallel.js';

const DEFAULT_MEASURE_CONCURRENCY = 16;

/**
 * Recursively measure a file or directory tree in bytes.
 * Symlinks are counted as the link inode, not followed.
 * Permission errors are skipped.
 */
export async function measureTreeBytes(
  targetPath: string,
  concurrency = DEFAULT_MEASURE_CONCURRENCY,
): Promise<number> {
  let info;
  try {
    info = await lstat(targetPath);
  } catch {
    return 0;
  }

  if (info.isSymbolicLink() || info.isFile()) {
    return info.size;
  }

  if (!info.isDirectory()) {
    return 0;
  }

  let entries;
  try {
    entries = await readdir(targetPath, { withFileTypes: true });
  } catch {
    return 0;
  }

  const childSizes = await mapWithConcurrency(
    entries,
    async (entry) => measureTreeBytes(path.join(targetPath, entry.name), concurrency),
    { concurrency },
  );

  return childSizes.reduce((sum, size) => sum + size, 0);
}
