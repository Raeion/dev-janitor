import { access } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { executeClean, pruneNestedFindings } from '../src/execution.js';
import { createFixture, pathFinding } from './helpers.js';

describe('executeClean', () => {
  it('dry-run does not delete', async () => {
    const root = await createFixture({
      'proj/node_modules/x.js': 'content',
    });
    const target = path.join(root, 'proj', 'node_modules');

    const result = await executeClean({
      findings: [
        pathFinding({
          cleaner: 'node-modules',
          path: target,
          sizeBytes: 7,
          risk: 'low',
          description: 'test',
        }),
      ],
      force: true,
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.deleted).toHaveLength(0);
    await access(target);
  });

  it('force deletes path findings', async () => {
    const root = await createFixture({
      'proj/node_modules/x.js': 'content',
    });
    const target = path.join(root, 'proj', 'node_modules');

    const result = await executeClean({
      findings: [
        pathFinding({
          cleaner: 'node-modules',
          path: target,
          sizeBytes: 7,
          risk: 'low',
          description: 'test',
        }),
      ],
      force: true,
      dryRun: false,
    });

    expect(result.deleted).toEqual([target]);
    expect(result.bytesFreed).toBe(7);
    await expect(access(target)).rejects.toThrow();
  });

  it('blocks deletion outside allowed roots', async () => {
    const root = await createFixture({
      'proj/node_modules/x.js': 'content',
    });
    const target = path.join(root, 'proj', 'node_modules');

    const result = await executeClean({
      findings: [
        pathFinding({
          cleaner: 'node-modules',
          path: target,
          sizeBytes: 7,
          risk: 'low',
          description: 'test',
        }),
      ],
      force: true,
      dryRun: false,
      allowedRoots: [path.join(root, 'other')],
    });

    expect(result.deleted).toHaveLength(0);
    expect(result.failed[0]?.error).toMatch(/outside scan root/i);
    await access(target);
  });
});

describe('pruneNestedFindings', () => {
  it('removes path findings nested under another path finding', () => {
    const findings = [
      pathFinding({
        cleaner: 'a',
        path: path.join('proj', 'node_modules'),
        sizeBytes: 100,
        risk: 'low',
        description: 'parent',
      }),
      pathFinding({
        cleaner: 'b',
        path: path.join('proj', 'node_modules', 'pkg'),
        sizeBytes: 40,
        risk: 'low',
        description: 'child',
      }),
      pathFinding({
        cleaner: 'a',
        path: path.join('other', 'node_modules'),
        sizeBytes: 50,
        risk: 'low',
        description: 'sibling',
      }),
      {
        kind: 'git-branch' as const,
        cleaner: 'git-stale-branches',
        path: '/repo :: feature',
        sizeBytes: 0,
        risk: 'high' as const,
        description: 'branch',
        repoRoot: '/repo',
        resourceId: 'feature',
      },
    ];

    const pruned = pruneNestedFindings(findings);
    expect(pruned).toHaveLength(3);
    expect(pruned.filter((f) => f.kind === 'path').map((f) => f.path)).toEqual([
      path.join('proj', 'node_modules'),
      path.join('other', 'node_modules'),
    ]);
    expect(pruned.some((f) => f.kind === 'git-branch')).toBe(true);
  });
});
