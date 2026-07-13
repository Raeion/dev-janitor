import { describe, expect, it } from 'vitest';
import {
  isPathAllowed,
  isSafeDockerResourceId,
  isSafeGitBranchName,
  validateFindingForDelete,
} from '../src/utils/validation.js';
import { executeClean } from '../src/execution.js';
import { pathFinding } from './helpers.js';

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
        path: 'C:\\outside\\node_modules',
        sizeBytes: 1,
        risk: 'low',
        description: 'x',
      }),
      ['C:\\inside'],
    );
    expect(error).toMatch(/outside scan root/i);
  });

  it('allows path equal to an allowed root', () => {
    expect(isPathAllowed('C:\\inside', ['C:\\inside'])).toBe(true);
    expect(isPathAllowed('C:\\inside\\app\\node_modules', ['C:\\inside'])).toBe(true);
    expect(isPathAllowed('C:\\outside', ['C:\\inside'])).toBe(false);
  });

  it('fail-closes when allowedRoots is empty', () => {
    expect(isPathAllowed('C:\\inside\\app', [])).toBe(false);
    const error = validateFindingForDelete(
      pathFinding({
        cleaner: 'node-modules',
        path: 'C:\\inside\\node_modules',
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
          path: 'repo :: evil',
          sizeBytes: 0,
          risk: 'high',
          description: 'bad',
          repoRoot: 'C:\\repo',
          resourceId: 'evil;drop',
        },
      ],
      force: true,
      dryRun: false,
      allowedRoots: ['C:\\repo'],
    });

    expect(result.deleted).toHaveLength(0);
    expect(result.failed[0]?.error).toMatch(/Unsafe git branch/);
  });

  it('rejects git repoRoot outside allowed roots', () => {
    const error = validateFindingForDelete(
      {
        kind: 'git-branch',
        cleaner: 'git-stale-branches',
        path: 'C:\\other :: feature',
        sizeBytes: 0,
        risk: 'high',
        description: 'branch',
        repoRoot: 'C:\\other',
        resourceId: 'feature',
      },
      ['C:\\inside'],
    );
    expect(error).toMatch(/outside scan root/i);
  });

  it('allows git repoRoot equal to an allowed root', () => {
    const error = validateFindingForDelete(
      {
        kind: 'git-branch',
        cleaner: 'git-stale-branches',
        path: 'C:\\inside :: feature',
        sizeBytes: 0,
        risk: 'high',
        description: 'branch',
        repoRoot: 'C:\\inside',
        resourceId: 'feature',
      },
      ['C:\\inside'],
    );
    expect(error).toBeUndefined();
  });

  it('allows paths inside allowed roots', () => {
    expect(isPathAllowed('C:\\inside\\app\\node_modules', ['C:\\inside'])).toBe(true);
    expect(isPathAllowed('C:\\outside', ['C:\\inside'])).toBe(false);
  });
});
