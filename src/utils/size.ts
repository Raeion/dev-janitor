import { measureTreeBytes } from './tree-size.js';

/**
 * Recursively calculate total size of a file or directory in bytes.
 * Symlinks are counted as the link itself (not the target) to avoid
 * following links outside the tree. Permission errors are skipped.
 */
export async function getSizeBytes(targetPath: string): Promise<number> {
  return measureTreeBytes(targetPath);
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Format bytes as a human-readable string (e.g. "4.2 GB"). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes === 0) {
    return '0 B';
  }

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const rounded = value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${UNITS[exponent]}`;
}
