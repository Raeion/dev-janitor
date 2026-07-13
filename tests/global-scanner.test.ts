import { describe, expect, it } from 'vitest';
import { scanGlobal } from '../src/global-scanner.js';
import type { Finding } from '../src/types.js';

const mockGlobalCleaner: import('../src/types.js').GlobalCleaner = {
  name: 'mock-global',
  description: 'test global cleaner',
  risk: 'low',
  scope: 'global',
  requiresCli: [],
  async scanGlobal(): Promise<import('../src/types.js').Finding[]> {
    return [
      {
        kind: 'path',
        cleaner: 'mock-global',
        path: '/virtual/target',
        sizeBytes: 10,
        risk: 'low',
        description: 'mock',
      },
    ];
  },
};

describe('scanGlobal', () => {
  it('runs global cleaners once', async () => {
    const result = await scanGlobal({
      cleaners: [mockGlobalCleaner],
    });
    expect(result.findings).toHaveLength(1);
    expect(result.skippedCleaners).toEqual([]);
  });

  it('skips cleaners with missing CLI when verbose', async () => {
    const needsGit: import('../src/types.js').GlobalCleaner = {
      name: 'needs-git',
      description: 'requires git',
      risk: 'low',
      scope: 'global',
      requiresCli: ['definitely-not-a-real-cli-tool-xyz'],
      async scanGlobal(): Promise<Finding[]> {
        return [];
      },
    };

    const warnings: string[] = [];
    const result = await scanGlobal({
      cleaners: [needsGit],
      verbose: true,
      onWarning: (msg) => warnings.push(msg),
    });

    expect(result.findings).toHaveLength(0);
    expect(result.skippedCleaners).toContain('needs-git');
    expect(warnings.length).toBeGreaterThan(0);
  });
});
