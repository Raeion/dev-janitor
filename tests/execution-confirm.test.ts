import { describe, expect, it } from 'vitest';
import { summarizeFindings } from '../src/execution.js';
import type { ConfirmDeletionFn } from '../src/types.js';
import { pathFinding } from './helpers.js';

describe('executeClean confirmation', () => {
  it('cancels when user declines confirmation', async () => {
    const { executeClean } = await import('../src/execution.js');
    const confirm: ConfirmDeletionFn = async () => false;

    const result = await executeClean({
      findings: [
        pathFinding({
          cleaner: 'node-modules',
          path: '/tmp/node_modules',
          sizeBytes: 100,
          risk: 'low',
          description: 'test',
        }),
      ],
      force: false,
      dryRun: false,
      confirm,
    });

    expect(result.cancelled).toBe(true);
    expect(result.deleted).toHaveLength(0);
  });

  it('cancels when confirm callback is missing', async () => {
    const { executeClean } = await import('../src/execution.js');
    const result = await executeClean({
      findings: [
        pathFinding({
          cleaner: 'node-modules',
          path: '/tmp/node_modules',
          sizeBytes: 100,
          risk: 'low',
          description: 'test',
        }),
      ],
      force: false,
      dryRun: false,
    });

    expect(result.cancelled).toBe(true);
    expect(result.wouldDelete).toHaveLength(1);
  });

  it('deletes when confirm callback approves', async () => {
    const root = await import('./helpers.js').then(async (h) =>
      h.createFixture({ 'proj/node_modules/x.js': 'content' }),
    );
    const target = `${root}/proj/node_modules`;

    const { executeClean } = await import('../src/execution.js');
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
      force: false,
      dryRun: false,
      confirm: async () => true,
    });

    expect(result.cancelled).toBe(false);
    expect(result.deleted).toEqual([target]);
  });
});

describe('summarizeFindings', () => {
  it('totals bytes and count', () => {
    const summary = summarizeFindings([
      pathFinding({
        cleaner: 'a',
        path: '/a',
        sizeBytes: 10,
        risk: 'low',
        description: 'a',
      }),
      pathFinding({
        cleaner: 'b',
        path: '/b',
        sizeBytes: 20,
        risk: 'low',
        description: 'b',
      }),
    ]);
    expect(summary).toEqual({ totalBytes: 30, count: 2 });
  });
});
