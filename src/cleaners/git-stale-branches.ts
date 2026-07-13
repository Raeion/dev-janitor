import path from 'node:path';
import type { GitRepoCleaner, Finding, GitScanContext } from '../types.js';
import { execCommand } from '../utils/process-exec.js';

async function runGit(
  repoRoot: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return execCommand('git', ['-C', repoRoot, ...args], { timeout: 30_000 });
}

export const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'HEAD']);

export function buildProtectedBranchSet(extra?: string[]): Set<string> {
  const protectedBranches = new Set(PROTECTED_BRANCHES);
  for (const branch of extra ?? []) {
    const trimmed = branch.trim();
    if (trimmed) {
      protectedBranches.add(trimmed);
    }
  }
  return protectedBranches;
}

export function parseBranchLines(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function getCurrentBranch(repoRoot: string): Promise<string | undefined> {
  try {
    const { stdout } = await runGit(repoRoot, ['branch', '--show-current']);
    const branch = stdout.trim();
    return branch || undefined;
  } catch {
    return undefined;
  }
}

export async function resolveDefaultBranch(repoRoot: string): Promise<string> {
  try {
    const { stdout } = await runGit(repoRoot, [
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      '--short',
    ]);
    const ref = stdout.trim();
    if (ref.startsWith('origin/')) {
      return ref.slice('origin/'.length);
    }
    if (ref) {
      return ref;
    }
  } catch {
    // fall through
  }

  for (const candidate of ['main', 'master']) {
    try {
      await runGit(repoRoot, ['rev-parse', '--verify', candidate]);
      return candidate;
    } catch {
      // try next
    }
  }

  const current = await getCurrentBranch(repoRoot);
  if (current) {
    return current;
  }

  return 'HEAD';
}

export const gitStaleBranchesCleaner: GitRepoCleaner = {
  name: 'git-stale-branches',
  description: 'Removes merged local Git branches (excludes main, master, develop, and current)',
  risk: 'high',
  scope: 'git-repo',
  requiresCli: ['git'],
  async scanRepo(repoRoot: string, context?: GitScanContext): Promise<Finding[]> {
    if (context?.gitFetch) {
      try {
        await runGit(repoRoot, ['fetch', '--prune']);
      } catch {
        // continue with local merge state when fetch fails
      }
    }

    const defaultBranch = await resolveDefaultBranch(repoRoot);
    const currentBranch = await getCurrentBranch(repoRoot);
    const protectedBranches = buildProtectedBranchSet(context?.protectedBranches);

    let stdout: string;
    try {
      const result = await runGit(repoRoot, [
        'branch',
        '--merged',
        defaultBranch,
        '--format=%(refname:short)',
      ]);
      stdout = result.stdout;
    } catch {
      return [];
    }

    const findings: Finding[] = [];
    for (const branch of parseBranchLines(stdout)) {
      if (protectedBranches.has(branch)) {
        continue;
      }
      if (branch === defaultBranch) {
        continue;
      }
      if (currentBranch && branch === currentBranch) {
        continue;
      }

      findings.push({
        kind: 'git-branch',
        cleaner: 'git-stale-branches',
        path: `${repoRoot} :: ${branch}`,
        sizeBytes: 0,
        risk: 'high',
        description: `Merged local branch "${branch}" in ${path.basename(repoRoot)}`,
        repoRoot,
        resourceId: branch,
      });
    }

    return findings;
  },
};
