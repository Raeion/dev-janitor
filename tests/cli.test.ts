import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { createFixture } from './helpers.js';

const execFileAsync = promisify(execFile);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(projectRoot, 'dist', 'cli.js');

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [cliPath, ...args], {
      cwd: projectRoot,
      timeout: 60_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      code: typeof err.code === 'number' ? err.code : 1,
    };
  }
}

describe('CLI integration', () => {
  it('prints version', async () => {
    const { stdout, code } = await runCli(['--version']);
    expect(code).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('list-cleaners outputs all built-in cleaners', async () => {
    const { stdout, code } = await runCli(['list-cleaners']);
    expect(code).toBe(0);
    expect(stdout).toContain('node-modules');
    expect(stdout).toContain('docker-resources');
    expect(stdout).toContain('git-stale-branches');
  });

  it('list-cleaners --json is valid JSON', async () => {
    const { stdout, code } = await runCli(['list-cleaners', '--json']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout) as { listedCleaners: Array<{ name: string }> };
    expect(parsed.listedCleaners.length).toBeGreaterThanOrEqual(6);
  });

  it('scan finds node_modules in fixture', async () => {
    const root = await createFixture({
      'app/node_modules/pkg/index.js': 'x',
    });

    const { stdout, code } = await runCli(['scan', root, '--type=node', '--json']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout) as {
      findings: Array<{ cleaner: string; path: string }>;
      totalBytes: number;
    };
    expect(parsed.findings.length).toBe(1);
    expect(parsed.findings[0]?.cleaner).toBe('node-modules');
    expect(parsed.totalBytes).toBeGreaterThan(0);
  });

  it('clean --dry-run does not delete', async () => {
    const root = await createFixture({
      'proj/node_modules/x.js': 'content',
    });
    const target = path.join(root, 'proj', 'node_modules');

    const { code } = await runCli(['clean', root, '--type=node', '--dry-run', '--json']);
    expect(code).toBe(0);

    const { stdout } = await runCli(['scan', target, '--type=node', '--json']);
    const parsed = JSON.parse(stdout) as { findings: unknown[] };
    expect(parsed.findings.length).toBe(1);
  });
});
