import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanRepos } from '../src/repo-scanner.js';
import type { GitRepoCleaner } from '../src/types.js';
import { createFixture } from './helpers.js';

const mockGitCleaner: GitRepoCleaner = {
  name: 'mock-git-cleaner',
  description: 'test git cleaner',
  risk: 'low',
  scope: 'git-repo',
  requiresCli: ['git'],
  async scanRepo() {
    return [];
  },
};

describe('scanRepos', () => {
  it('dedupes nested git repo roots', async () => {
    const root = await createFixture({});
    const nested = path.join(root, 'nested');

    const result = await scanRepos({
      repoRoots: [root, nested],
      cleaners: [mockGitCleaner],
    });

    expect(result.scannedRepos).toBe(1);
  });

  it('reports skipped cleaners when git is unavailable', async () => {
    const fakeCleaner: GitRepoCleaner = {
      name: 'fake-git-cleaner',
      description: 'test',
      risk: 'low',
      scope: 'git-repo',
      requiresCli: ['definitely-not-a-real-cli-tool-xyz'],
      async scanRepo() {
        return [];
      },
    };

    const result = await scanRepos({
      repoRoots: ['/tmp/repo'],
      cleaners: [fakeCleaner],
      verbose: true,
    });

    expect(result.findings).toHaveLength(0);
    expect(result.skippedCleaners).toContain('fake-git-cleaner');
  });
});
