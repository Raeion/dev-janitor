import { describe, expect, it } from 'vitest';
import { toolingCachesCleaner } from '../src/cleaners/tooling-caches.js';
import { javaGradleCleaner } from '../src/cleaners/java-gradle.js';
import { scan } from '../src/scan-orchestrator.js';
import { createFixture } from './helpers.js';

describe('tooling-caches cleaner', () => {
  it('detects framework cache directories', () => {
    expect(toolingCachesCleaner.detect('/app/.vite')).toBe(true);
    expect(toolingCachesCleaner.detect('/app/.terraform')).toBe(true);
    expect(toolingCachesCleaner.detect('/app/src')).toBe(false);
  });
});

describe('java-gradle cleaner', () => {
  it('detects .gradle directories', async () => {
    const root = await createFixture({
      'android/.gradle/caches/file': 'x',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [javaGradleCleaner],
      ignore: [],
      scope: 'filesystem',
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.cleaner).toBe('java-gradle');
  });
});
