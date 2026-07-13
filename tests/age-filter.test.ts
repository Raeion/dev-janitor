import { utimes } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { nodeModulesCleaner } from '../src/cleaners/node-modules.js';
import { scan } from '../src/scan-orchestrator.js';
import { createFixture } from './helpers.js';

describe('minAgeDays filtering', () => {
  it('skips recently modified age-filterable directories', async () => {
    const root = await createFixture({
      'fresh/node_modules/pkg/index.js': 'x',
      'stale/node_modules/pkg/index.js': 'y',
    });

    const stalePath = path.join(root, 'stale', 'node_modules');
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 86_400_000);
    await utimes(stalePath, thirtyOneDaysAgo, thirtyOneDaysAgo);

    const result = await scan({
      rootPath: root,
      cleaners: [nodeModulesCleaner],
      ignore: [],
      scope: 'filesystem',
      minAgeDays: 30,
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe(stalePath);
  });
});
