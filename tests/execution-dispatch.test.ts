import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockExecCommand = vi.hoisted(() => vi.fn());

vi.mock('../src/utils/process-exec.js', () => ({
  execCommand: mockExecCommand,
}));

describe('executeClean git dispatch', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('deletes git branches via git branch -d', async () => {
    mockExecCommand.mockResolvedValue({ stdout: '', stderr: '' });

    const { executeClean } = await import('../src/execution.js');
    const result = await executeClean({
      findings: [
        {
          kind: 'git-branch',
          cleaner: 'git-stale-branches',
          path: '/repo :: feature-old',
          sizeBytes: 0,
          risk: 'high',
          description: 'branch',
          repoRoot: '/repo',
          resourceId: 'feature-old',
        },
      ],
      force: true,
      dryRun: false,
    });

    expect(result.deleted).toHaveLength(1);
    expect(mockExecCommand).toHaveBeenCalledWith(
      'git',
      ['-C', '/repo', 'branch', '-d', 'feature-old'],
      expect.objectContaining({ timeout: 30_000 }),
    );
  });

  it('returns empty result for no findings', async () => {
    const { executeClean } = await import('../src/execution.js');
    const result = await executeClean({
      findings: [],
      force: true,
      dryRun: false,
    });
    expect(result.deleted).toHaveLength(0);
  });
});
