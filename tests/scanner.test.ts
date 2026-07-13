import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scan } from '../src/scan-orchestrator.js';
import { nodeModulesCleaner } from '../src/cleaners/node-modules.js';
import { pythonCacheCleaner } from '../src/cleaners/python-cache.js';
import { pythonVenvCleaner } from '../src/cleaners/python-venv.js';
import { osJunkCleaner } from '../src/cleaners/os-junk.js';
import { createFixture } from './helpers.js';

describe('scan filesystem', () => {
  it('finds nested node_modules and skips children', async () => {
    const root = await createFixture({
      'app/package.json': '{}',
      'app/node_modules/leftpad/index.js': 'module.exports=1',
      'app/node_modules/leftpad/nested/deep.js': 'x',
      'other/src/index.js': 'console.log(1)',
      'other/node_modules/pkg/index.js': 'y',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [nodeModulesCleaner],
      ignore: [],
    });

    expect(result.findings).toHaveLength(2);
    expect(result.findings.every((f) => f.cleaner === 'node-modules')).toBe(true);
    expect(result.findings.every((f) => f.kind === 'path')).toBe(true);
    expect(result.totalBytes).toBeGreaterThan(0);

    const paths = result.findings.map((f) => f.path).sort();
    expect(paths.some((p) => p.endsWith(path.join('app', 'node_modules')))).toBe(true);
    expect(paths.some((p) => p.endsWith(path.join('other', 'node_modules')))).toBe(true);
  });

  it('respects ignore globs', async () => {
    const root = await createFixture({
      'keep/node_modules/a.js': 'a',
      'skip-me/node_modules/b.js': 'b',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [nodeModulesCleaner],
      ignore: ['skip-me/**'],
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toContain('keep');
  });

  it('finds python cache directories', async () => {
    const root = await createFixture({
      'proj/__pycache__/mod.pyc': 'bytecode',
      'proj/.pytest_cache/v/cache': 'data',
      'proj/src/main.py': 'print()',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [pythonCacheCleaner],
      ignore: [],
    });

    expect(result.findings).toHaveLength(2);
    expect(result.findings.map((f) => path.basename(f.path)).sort()).toEqual([
      '.pytest_cache',
      '__pycache__',
    ]);
  });

  it('finds python venv directories', async () => {
    const root = await createFixture({
      'app/.venv/lib/python3/site.py': 'x',
      'legacy/venv/bin/python': 'y',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [pythonVenvCleaner],
      ignore: [],
    });

    expect(result.findings).toHaveLength(2);
  });

  it('finds OS junk files', async () => {
    const root = await createFixture({
      'folder/.DS_Store': 'metadata',
      'folder/Thumbs.db': 'thumb',
      'folder/readme.txt': 'ok',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [osJunkCleaner],
      ignore: [],
    });

    expect(result.findings).toHaveLength(2);
    expect(result.findings.some((f) => f.path.includes('.DS_Store'))).toBe(true);
    expect(result.findings.some((f) => f.path.includes('Thumbs.db'))).toBe(true);
  });

  it('discovers git repos during walk when git scope is enabled', async () => {
    const root = await createFixture({
      'repo/README.md': '# hi',
      'repo/.git/HEAD': 'ref: refs/heads/main\n',
      'repo/.git/config': '[core]\n',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [nodeModulesCleaner],
      ignore: [],
      scope: 'git',
    });

    expect(result.gitRepos).toBe(1);
  });

  it('does not count git repos under filesystem-only scope', async () => {
    const root = await createFixture({
      'repo/README.md': '# hi',
      'repo/.git/HEAD': 'ref: refs/heads/main\n',
      'repo/.git/config': '[core]\n',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [nodeModulesCleaner],
      ignore: [],
      scope: 'filesystem',
    });

    expect(result.gitRepos).toBe(0);
  });

  it('discovers submodule-style .git files when git scope is enabled', async () => {
    const root = await createFixture({
      'sub/README.md': '# submodule',
      'sub/.git': 'gitdir: ../.git/modules/sub\n',
    });

    const result = await scan({
      rootPath: root,
      cleaners: [nodeModulesCleaner],
      ignore: [],
      scope: 'git',
    });

    expect(result.gitRepos).toBe(1);
  });
});
