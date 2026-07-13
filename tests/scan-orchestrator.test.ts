import { describe, expect, it } from 'vitest';
import { scan } from '../src/scan-orchestrator.js';
import { dockerResourcesCleaner } from '../src/cleaners/docker-resources.js';
import { createFixture } from './helpers.js';

describe('scan orchestrator scope', () => {
  it('skips filesystem walk when scope is global', async () => {
    const root = await createFixture({
      'app/node_modules/pkg/index.js': 'x',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [dockerResourcesCleaner],
      ignore: [],
      scope: 'global',
    });

    expect(result.scannedDirs).toBe(0);
    expect(result.findings.some((f) => f.cleaner === 'node-modules')).toBe(false);
  });
});
