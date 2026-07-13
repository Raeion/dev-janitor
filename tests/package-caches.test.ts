import { describe, expect, it } from 'vitest';
import { scanPackageCaches } from '../src/cleaners/package-caches.js';
import { createFixture } from './helpers.js';

describe('package-caches cleaner', () => {
  it('finds npm and pnpm caches under the home directory', async () => {
    const home = await createFixture({
      '.npm/_cacache/index-v5/file': 'npm',
      '.local/share/pnpm/store/v10/file': 'pnpm',
    });

    const findings = await scanPackageCaches(home);

    expect(findings.length).toBeGreaterThanOrEqual(2);
    expect(findings.some((f) => f.path.includes('.npm'))).toBe(true);
    expect(findings.every((f) => f.risk === 'medium')).toBe(true);
  });
});
