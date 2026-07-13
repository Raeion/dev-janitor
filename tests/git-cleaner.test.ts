import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { gitStaleBranchesCleaner } from '../src/cleaners/git-stale-branches.js';
import { scan } from '../src/scan-orchestrator.js';
import { executeClean } from '../src/execution.js';
import { isCliAvailable } from '../src/utils/cli-deps.js';
import { createFixture } from './helpers.js';

const execFileAsync = promisify(execFile);
const GIT_TEST_TIMEOUT_MS = 30_000;

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, timeout: 30_000 });
  return stdout.trim();
}

async function currentBranch(root: string): Promise<string> {
  return runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

async function initRepoWithBranches(): Promise<string> {
  const root = await createFixture({ 'README.md': '# test repo' });

  await runGit(root, ['init']);
  await runGit(root, ['config', 'core.longpaths', 'true']);
  await runGit(root, ['config', 'user.email', 'test@example.com']);
  await runGit(root, ['config', 'user.name', 'Test User']);
  await runGit(root, ['add', '.']);
  await runGit(root, ['commit', '-m', 'initial']);

  const defaultBranch = await currentBranch(root);

  await runGit(root, ['checkout', '-b', 'feature-merged']);
  await writeFile(path.join(root, 'feature.txt'), 'feature', 'utf8');
  await runGit(root, ['add', 'feature.txt']);
  await runGit(root, ['commit', '-m', 'feature work']);
  await runGit(root, ['checkout', defaultBranch]);
  await runGit(root, ['merge', 'feature-merged', '--no-edit']);

  await runGit(root, ['checkout', '-b', 'feature-active']);
  await writeFile(path.join(root, 'active.txt'), 'active', 'utf8');
  await runGit(root, ['add', 'active.txt']);
  await runGit(root, ['commit', '-m', 'active work']);
  await runGit(root, ['checkout', defaultBranch]);

  return root;
}

const gitAvailable = await isCliAvailable('git');

describe.skipIf(!gitAvailable)('git-stale-branches cleaner', () => {
  it(
    'finds merged branches excluding default and active branches',
    async () => {
      const root = await initRepoWithBranches();
      const defaultBranch = await currentBranch(root);
      const findings = await gitStaleBranchesCleaner.scanRepo(root);

      const branches = findings.map((f) => f.resourceId);
      expect(branches).toContain('feature-merged');
      expect(branches).not.toContain(defaultBranch);
      expect(branches).not.toContain('feature-active');
      expect(findings.every((f) => f.kind === 'git-branch')).toBe(true);
      expect(findings.every((f) => f.risk === 'high')).toBe(true);
    },
    GIT_TEST_TIMEOUT_MS,
  );

  it(
    'respects extra protected branches from config context',
    async () => {
      const root = await initRepoWithBranches();
      const findings = await gitStaleBranchesCleaner.scanRepo(root, {
        protectedBranches: ['feature-merged'],
      });

      expect(findings.map((f) => f.resourceId)).not.toContain('feature-merged');
    },
    GIT_TEST_TIMEOUT_MS,
  );

  it(
    'integrates with scan when .git is discovered',
    async () => {
      const root = await initRepoWithBranches();
      const result = await scan({
        rootPath: root,
        cleaners: [gitStaleBranchesCleaner],
        ignore: [],
        scope: 'git',
      });

      expect(result.gitRepos).toBe(1);
      expect(result.findings.some((f) => f.resourceId === 'feature-merged')).toBe(true);
    },
    GIT_TEST_TIMEOUT_MS,
  );

  it(
    'deletes merged branch with force clean',
    async () => {
      const root = await initRepoWithBranches();
      const findings = await gitStaleBranchesCleaner.scanRepo(root);
      const target = findings.find((f) => f.resourceId === 'feature-merged');
      expect(target).toBeDefined();

      const result = await executeClean({
        findings: target ? [target] : [],
        force: true,
        dryRun: false,
      });

      expect(result.deleted).toHaveLength(1);
      const branches = await runGit(root, ['branch']);
      expect(branches).not.toContain('feature-merged');
    },
    GIT_TEST_TIMEOUT_MS,
  );
});
