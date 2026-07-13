import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildArtifactsCleaner } from '../src/cleaners/build-artifacts.js';
import { scan } from '../src/scan-orchestrator.js';
import { createFixture } from './helpers.js';

describe('build-artifacts cleaner', () => {
  it('detects common build output directories', () => {
    expect(buildArtifactsCleaner.detect('/app/.next')).toBe(true);
    expect(buildArtifactsCleaner.detect('/app/dist')).toBe(true);
    expect(buildArtifactsCleaner.detect('/app/target')).toBe(true);
    expect(buildArtifactsCleaner.detect('/app/.turbo')).toBe(true);
    expect(buildArtifactsCleaner.detect('/app/src')).toBe(false);
  });

  it('finds build artifacts during scan', async () => {
    const root = await createFixture({
      'web/.next/cache/file': 'x',
      'api/dist/index.js': 'y',
      'rust/target/debug/app': 'z',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [buildArtifactsCleaner],
      ignore: [],
      scope: 'filesystem',
    });

    const names = result.findings.map((f) => path.basename(f.path)).sort();
    expect(names).toEqual(['.next', 'dist', 'target']);
  });
});
