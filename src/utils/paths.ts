import path from 'node:path';

function normalizeForComparison(absolutePath: string): string {
  const resolved = path.resolve(absolutePath);
  if (process.platform === 'win32') {
    return resolved.toLowerCase();
  }
  return resolved;
}

/**
 * Returns true when `child` is strictly inside `parent` on disk.
 * Case-insensitive on Windows to avoid missed nested-path pruning.
 */
export function isPathInside(child: string, parent: string): boolean {
  const resolvedChild = normalizeForComparison(child);
  const resolvedParent = normalizeForComparison(parent);

  if (resolvedChild === resolvedParent) {
    return false;
  }

  const prefix = resolvedParent.endsWith(path.sep)
    ? resolvedParent
    : resolvedParent + path.sep;

  return resolvedChild.startsWith(prefix);
}

/** Returns true when `child` is a Git repo nested inside `parent` repo. */
export function isNestedRepoRoot(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
