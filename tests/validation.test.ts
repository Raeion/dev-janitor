import path from 'node:path';
import os from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  isPathAllowed,
  isSafeDockerResourceId,
  isSafeGitBranchName,
  validateFindingForDelete,
} from '../src/utils/validation.js';
import { executeClean } from '../src/execution.js';
import { pathFinding } from './helpers.js';

const allowedRoot = path.join(os.tmpdir(), 'dj-allowed-root');
const nestedPath = path.join(allowedRoot, 'app', 'node_modules');
const outsidePath = path.join(os.tmpdir(), 'dj-outside-root', 'node_modules');
const outsideRepo = path.join(os.tmpdir(), 'dj-outside-repo');

describe('validation', () => {
  it('accepts safe git branch names', () => {
    expect(isSafeGitBranchName('feature/foo')).toBe(true);
    expect(isSafeGitBranchName('feature;rm -rf')).toBe(false);
  });

  it('accepts safe docker ids', () => {
    expect(isSafeDockerResourceId('sha256:abc123')).toBe(true);
    expect(isSafeDockerResourceId('evil;docker')).toBe(false);
  });

  it('enforces allowed roots for path findings', () => {
    const error = validateFindingForDelete(
      pathFinding({
        cleaner: 'node-modules',
        path: outsidePath,
        sizeBytes: 1,
        risk: 'low',
        description: 'x',
      }),
      [allowedRoot],
    );
    expect(error).toMatch(/outside scan root/i);
  });

  it('allows path equal to an allowed root', () => {
    expect(isPathAllowed(allowedRoot, [allowedRoot])).toBe(true);
    expect(isPathAllowed(nestedPath, [allowedRoot])).toBe(true);
    expect(isPathAllowed(outsidePath, [allowedRoot])).toBe(false);
  });

  it('fail-closes when allowedRoots is empty', () => {
    expect(isPathAllowed(nestedPath, [])).toBe(false);
    const error = validateFindingForDelete(
      pathFinding({
        cleaner: 'node-modules',
        path: nestedPath,
        sizeBytes: 1,
        risk: 'low',
        description: 'x',
      }),
      [],
    );
    expect(error).toMatch(/outside scan root/i);
  });

  it('rejects unsafe branch names during clean', async () => {
    const result = await executeClean({
      findings: [
        {
          kind: 'git-branch',
          cleaner: 'git-stale-branches',
          path: `${allowedRoot} :: evil`,
          sizeBytes: 0,
          risk: 'high',
          description: 'bad',
          repoRoot: allowedRoot,
          resourceId: 'evil;drop',
        },
      ],
      force: true,
      dryRun: false,
      allowedRoots: [allowedRoot],
    });

    expect(result.deleted).toHaveLength(0);
    expect(result.failed[0]?.error).toMatch(/Unsafe git branch/);
  });

  it('rejects git repoRoot outside allowed roots', () => {
    const error = validateFindingForDelete(
      {
        kind: 'git-branch',
        cleaner: 'git-stale-branches',
        path: `${outsideRepo} :: feature`,
        sizeBytes: 0,
        risk: 'high',
        description: 'branch',
        repoRoot: outsideRepo,
        resourceId: 'feature',
      },
      [allowedRoot],
    );
    expect(error).toMatch(/outside scan root/i);
  });

  it('allows git repoRoot equal to an allowed root', () => {
    const error = validateFindingForDelete(
      {
        kind: 'git-branch',
        cleaner: 'git-stale-branches',
        path: `${allowedRoot} :: feature`,
        sizeBytes: 0,
        risk: 'high',
        description: 'branch',
        repoRoot: allowedRoot,
        resourceId: 'feature',
      },
      [allowedRoot],
    );
    expect(error).toBeUndefined();
  });

  it('allows paths inside allowed roots', () => {
    expect(isPathAllowed(nestedPath, [allowedRoot])).toBe(true);
    expect(isPathAllowed(outsidePath, [allowedRoot])).toBe(false);
  });
});
