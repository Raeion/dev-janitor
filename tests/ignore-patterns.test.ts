import { describe, expect, it } from 'vitest';
import { sanitizeIgnorePatterns, usableIgnorePatterns } from '../src/utils/ignore-patterns.js';
import { scan } from '../src/scan-orchestrator.js';
import { nodeModulesCleaner } from '../src/cleaners/node-modules.js';
import { createFixture } from './helpers.js';

describe('sanitizeIgnorePatterns', () => {
  it('removes empty patterns and records warnings', () => {
    const { ignore, warnings } = sanitizeIgnorePatterns(['', '**/vendor/**']);
    expect(ignore).toEqual(['**/vendor/**']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.field).toBe('ignore');
  });
});

describe('usableIgnorePatterns', () => {
  it('filters empty patterns for runtime scanning', () => {
    expect(usableIgnorePatterns(['', '**/keep/**'])).toEqual(['**/keep/**']);
  });
});

describe('scanner ignore safety', () => {
  it('does not crash when ignore contains empty strings', async () => {
    const root = await createFixture({
      'app/node_modules/pkg/index.js': 'x',
      'vendor/lib.js': 'y',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [nodeModulesCleaner],
      ignore: ['', '**/vendor/**'],
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toContain('node_modules');
  });
});
