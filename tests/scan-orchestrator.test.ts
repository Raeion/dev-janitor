import { describe, expect, it } from 'vitest';
import { scan } from '../src/scan-orchestrator.js';
import type { GlobalCleaner } from '../src/types.js';
import { createFixture } from './helpers.js';

const fakeGlobalCleaner: GlobalCleaner = {
  name: 'fake-global',
  description: 'Test global cleaner with no CLI dependency',
  risk: 'low',
  scope: 'global',
  requiresCli: [],
  async scanGlobal() {
    return [];
  },
};

describe('scan orchestrator scope', () => {
  it('skips filesystem walk when scope is global', async () => {
    const root = await createFixture({
      'app/node_modules/pkg/index.js': 'x',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [fakeGlobalCleaner],
      ignore: [],
      scope: 'global',
    });

    expect(result.scannedDirs).toBe(0);
    expect(result.findings.some((f) => f.cleaner === 'node-modules')).toBe(false);
  });
});
