import { describe, expect, it } from 'vitest';
import { gitStaleBranchesCleaner } from '../src/cleaners/git-stale-branches.js';
import { nodeModulesCleaner } from '../src/cleaners/node-modules.js';
import {
  inferScopeFromCleaners,
  resolveCleaners,
  resolveEffectiveScope,
} from '../src/cleaners/index.js';
import { filterCleanersByScope, parseScanScope } from '../src/utils/scope.js';
import { scan } from '../src/scan-orchestrator.js';
import { createFixture } from './helpers.js';

describe('filterCleanersByScope', () => {
  it('defaults to filesystem cleaners only', () => {
    const cleaners = resolveCleaners({ configCleaners: [] });
    const filtered = filterCleanersByScope(cleaners, 'filesystem');
    expect(filtered.every((c) => c.scope === 'filesystem')).toBe(true);
    expect(filtered.some((c) => c.name === 'docker-resources')).toBe(false);
    expect(filtered.some((c) => c.name === 'git-stale-branches')).toBe(false);
  });

  it('includes global cleaners only for global scope', () => {
    const cleaners = resolveCleaners({ configCleaners: [] });
    const filtered = filterCleanersByScope(cleaners, 'global');
    expect(filtered.map((c) => c.name).sort()).toEqual([
      'docker-resources',
      'package-caches',
    ]);
  });
});

describe('parseScanScope', () => {
  it('parses valid scopes', () => {
    expect(parseScanScope('filesystem')).toBe('filesystem');
    expect(parseScanScope('all')).toBe('all');
  });

  it('throws on unknown scope', () => {
    expect(() => parseScanScope('nope')).toThrow(/Unknown scope/);
  });
});

describe('resolveEffectiveScope', () => {
  it('uses all scope when --type is set', () => {
    const cleaners = resolveCleaners({ typeFilter: 'docker', configCleaners: [] });
    expect(
      resolveEffectiveScope({
        typeFilter: 'docker',
        configScope: 'filesystem',
        cleaners,
        configCleaners: [],
      }),
    ).toBe('all');
  });

  it('infers git scope from config cleaner list', () => {
    const cleaners = resolveCleaners({ configCleaners: ['git-stale-branches'] });
    expect(
      resolveEffectiveScope({
        configScope: 'filesystem',
        cleaners,
        configCleaners: ['git-stale-branches'],
      }),
    ).toBe('git');
  });

  it('defaults to filesystem', () => {
    const cleaners = resolveCleaners({ configCleaners: [] });
    expect(
      resolveEffectiveScope({
        configScope: 'filesystem',
        cleaners,
        configCleaners: [],
      }),
    ).toBe('filesystem');
  });
});

describe('inferScopeFromCleaners', () => {
  it('returns all for mixed scopes', () => {
    expect(inferScopeFromCleaners([nodeModulesCleaner, gitStaleBranchesCleaner])).toBe('all');
  });
});

describe('scan scope integration', () => {
  it('does not run docker cleaner under default filesystem scope', async () => {
    const root = await createFixture({
      'app/node_modules/pkg/index.js': 'x',
    });

    const cleaners = resolveCleaners({ configCleaners: [] });
    const result = await scan({
      rootPath: root,
      cleaners,
      ignore: [],
      scope: 'filesystem',
    });

    expect(result.findings.some((f) => f.cleaner === 'docker-resources')).toBe(false);
    expect(result.findings.some((f) => f.cleaner === 'node-modules')).toBe(true);
  });
});
