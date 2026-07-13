import path from 'node:path';
import type { Finding } from '../types.js';
import { isPathInside } from './paths.js';

/** Git branch names safe to pass as CLI arguments. */
const SAFE_BRANCH = /^[A-Za-z0-9._/-]+$/;

/** Docker image/container/volume ids (hex or name chars). */
const SAFE_DOCKER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

export function isSafeGitBranchName(branch: string): boolean {
  const trimmed = branch.trim();
  if (!trimmed || trimmed.includes('..') || trimmed.startsWith('-')) {
    return false;
  }
  return SAFE_BRANCH.test(trimmed);
}

export function isSafeDockerResourceId(resourceId: string): boolean {
  const trimmed = resourceId.trim();
  if (!trimmed || trimmed.includes('..')) {
    return false;
  }
  return SAFE_DOCKER_ID.test(trimmed);
}

/**
 * True when `targetPath` equals or is nested under at least one allowed root.
 * Empty `allowedRoots` is fail-closed (nothing allowed).
 */
export function isPathAllowed(targetPath: string, allowedRoots: string[]): boolean {
  if (allowedRoots.length === 0) {
    return false;
  }

  const resolved = path.resolve(targetPath);
  return allowedRoots.some((root) => {
    const resolvedRoot = path.resolve(root);
    return resolved === resolvedRoot || isPathInside(resolved, resolvedRoot);
  });
}

export function validateFindingForDelete(
  finding: Finding,
  allowedRoots: string[] | undefined,
): string | undefined {
  if (finding.kind === 'path' && allowedRoots !== undefined) {
    if (!isPathAllowed(finding.path, allowedRoots)) {
      return `Refusing to delete path outside scan root: ${finding.path}`;
    }
  }

  if (finding.kind === 'git-branch') {
    const branch = finding.resourceId ?? '';
    if (!isSafeGitBranchName(branch)) {
      return `Unsafe git branch name: ${branch}`;
    }

    if (allowedRoots !== undefined) {
      const repoRoot = finding.repoRoot ?? '';
      if (!repoRoot || !isPathAllowed(repoRoot, allowedRoots)) {
        return `Refusing to delete git branch outside scan root: ${repoRoot || '(missing)'}`;
      }
    }
  }

  if (finding.kind === 'docker-resource') {
    const id = finding.resourceId ?? '';
    if (!isSafeDockerResourceId(id)) {
      return `Unsafe docker resource id: ${id}`;
    }
  }

  return undefined;
}
