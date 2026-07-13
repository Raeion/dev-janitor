import { describe, expect, it } from 'vitest';
import { loadConfig, validateConfig } from '../src/config.js';
import { createFixture } from './helpers.js';

describe('loadConfig', () => {
  it('returns defaults when no config exists', async () => {
    const root = await createFixture({ 'readme.txt': 'hi' });
    const config = await loadConfig(root);
    expect(config.ignore).toEqual([]);
    expect(config.cleaners).toEqual([]);
    expect(config.scope).toBe('filesystem');
    expect(config.minAgeDays).toBe(0);
    expect(config.protectedBranches).toEqual([]);
    expect(config.gitFetch).toBe(false);
    expect(config.warnings).toEqual([]);
  });

  it('loads .janitorrc', async () => {
    const root = await createFixture({
      '.janitorrc': JSON.stringify({
        ignore: ['**/vendor/**'],
        cleaners: ['node-modules'],
      }),
    });
    const config = await loadConfig(root);
    expect(config.ignore).toEqual(['**/vendor/**']);
    expect(config.cleaners).toEqual(['node-modules']);
    expect(config.warnings).toEqual([]);
  });

  it('throws when every configured cleaner name is unknown', async () => {
    const root = await createFixture({
      '.janitorrc': JSON.stringify({
        cleaners: ['not-a-real-cleaner'],
      }),
    });

    await expect(loadConfig(root)).rejects.toThrow(/No valid cleaners in config/);
  });

  it('keeps valid cleaners and warns on unknown names', async () => {
    const root = await createFixture({
      '.janitorrc': JSON.stringify({
        cleaners: ['not-a-real-cleaner', 'node-modules'],
      }),
    });
    const config = await loadConfig(root);
    expect(config.cleaners).toEqual(['node-modules']);
    expect(config.warnings.some((w) => w.field === 'cleaners')).toBe(true);
  });

  it('drops invalid ignore globs instead of passing them to the scanner', async () => {
    const root = await createFixture({
      '.janitorrc': JSON.stringify({
        ignore: ['', '**/vendor/**'],
      }),
    });
    const config = await loadConfig(root);
    expect(config.ignore).toEqual(['**/vendor/**']);
    expect(config.warnings.filter((w) => w.field === 'ignore')).toHaveLength(1);
  });
});

describe('validateConfig', () => {
  it('flags empty ignore globs', () => {
    const warnings = validateConfig({
      ignore: [''],
      cleaners: [],
      scope: 'filesystem',
      minAgeDays: 0,
      protectedBranches: [],
      gitFetch: false,
    });
    expect(warnings.some((w) => w.field === 'ignore')).toBe(true);
  });
});
