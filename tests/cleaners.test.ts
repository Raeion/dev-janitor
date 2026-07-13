import { describe, expect, it } from 'vitest';
import { resolveCleaners } from '../src/cleaners/index.js';
import { nodeModulesCleaner } from '../src/cleaners/node-modules.js';
import { pythonCacheCleaner } from '../src/cleaners/python-cache.js';
import { osJunkCleaner } from '../src/cleaners/os-junk.js';
import { gitStaleBranchesCleaner } from '../src/cleaners/git-stale-branches.js';
import { dockerResourcesCleaner } from '../src/cleaners/docker-resources.js';
import { clearCliAvailabilityCache } from '../src/utils/cli-deps.js';

describe('resolveCleaners', () => {
  it('filters by --type alias', () => {
    const cleaners = resolveCleaners({ typeFilter: 'node', configCleaners: [] });
    expect(cleaners).toHaveLength(1);
    expect(cleaners[0]?.name).toBe('node-modules');
  });

  it('resolves docker alias', () => {
    const cleaners = resolveCleaners({ typeFilter: 'docker', configCleaners: [] });
    expect(cleaners[0]?.name).toBe('docker-resources');
  });

  it('returns all cleaners by default', () => {
    const cleaners = resolveCleaners({ configCleaners: [] });
    expect(cleaners.length).toBeGreaterThanOrEqual(10);
  });

  it('throws on unknown type', () => {
    expect(() => resolveCleaners({ typeFilter: 'unknown-thing', configCleaners: [] })).toThrow(
      /Unknown cleaner/,
    );
  });

  it('resolves config cleaner list', () => {
    const cleaners = resolveCleaners({
      configCleaners: ['node-modules', 'python-cache'],
    });
    expect(cleaners.map((c) => c.name)).toEqual(['node-modules', 'python-cache']);
  });

  it('throws on unknown config cleaner', () => {
    expect(() =>
      resolveCleaners({ configCleaners: ['not-real'] }),
    ).toThrow(/Unknown cleaner in config/);
  });
});

describe('cli-deps', () => {
  it('caches CLI availability checks', async () => {
    clearCliAvailabilityCache();
    const { isCliAvailable } = await import('../src/utils/cli-deps.js');
    const first = await isCliAvailable('node');
    const second = await isCliAvailable('node');
    expect(first).toBe(second);
  });
});

describe('cleaner definitions', () => {
  it('node-modules detects directories only', () => {
    expect(nodeModulesCleaner.detect?.('/proj/node_modules')).toBe(true);
    expect(nodeModulesCleaner.detect?.('/proj/src')).toBe(false);
    expect(nodeModulesCleaner.scope).toBe('filesystem');
  });

  it('python-cache detects cache dir names', () => {
    expect(pythonCacheCleaner.detect?.('/proj/__pycache__')).toBe(true);
    expect(pythonCacheCleaner.detect?.('/proj/.pytest_cache')).toBe(true);
    expect(pythonCacheCleaner.detect?.('/proj/src')).toBe(false);
  });

  it('os-junk detects metadata files', () => {
    expect(osJunkCleaner.target).toBe('file');
    expect(osJunkCleaner.detect?.('/proj/.DS_Store')).toBe(true);
    expect(osJunkCleaner.detect?.('/proj/Thumbs.db')).toBe(true);
  });

  it('git cleaner requires git cli', () => {
    expect(gitStaleBranchesCleaner.scope).toBe('git-repo');
    expect(gitStaleBranchesCleaner.requiresCli).toContain('git');
    expect(gitStaleBranchesCleaner.risk).toBe('high');
  });

  it('docker cleaner requires docker cli', () => {
    expect(dockerResourcesCleaner.scope).toBe('global');
    expect(dockerResourcesCleaner.requiresCli).toContain('docker');
  });
});
