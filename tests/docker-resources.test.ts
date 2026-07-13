import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockExecCommand = vi.hoisted(() => vi.fn());

vi.mock('../src/utils/process-exec.js', () => ({
  execCommand: mockExecCommand,
}));

describe('docker-resources cleaner', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('collects dangling images, exited containers, and volumes', async () => {
    mockExecCommand.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args.includes('images')) {
        return { stdout: 'img1\nimg2\n', stderr: '' };
      }
      if (args.includes('ps')) {
        return { stdout: 'ctr1\n', stderr: '' };
      }
      if (args.includes('volume') && args.includes('ls')) {
        return { stdout: 'vol1\n', stderr: '' };
      }
      if (args.includes('inspect') || args.includes('df')) {
        return { stdout: '1024', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const { dockerResourcesCleaner } = await import('../src/cleaners/docker-resources.js');
    const findings = await dockerResourcesCleaner.scanGlobal!();
    expect(findings).toHaveLength(4);
    expect(findings.filter((f) => f.dockerType === 'image')).toHaveLength(2);
    expect(findings.filter((f) => f.dockerType === 'container')).toHaveLength(1);
    expect(findings.filter((f) => f.dockerType === 'volume')).toHaveLength(1);
  });

  it('parseDockerIds handles empty output', async () => {
    const { parseDockerIds } = await import('../src/cleaners/docker-resources.js');
    expect(parseDockerIds('  \n  ')).toEqual([]);
  });
});

describe('executeClean docker dispatch', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('deletes docker resources by type', async () => {
    mockExecCommand.mockResolvedValue({ stdout: '', stderr: '' });

    const { executeClean } = await import('../src/execution.js');
    const result = await executeClean({
      findings: [
        {
          kind: 'docker-resource',
          cleaner: 'docker-resources',
          path: 'image:abc',
          sizeBytes: 0,
          risk: 'medium',
          description: 'img',
          dockerType: 'image',
          resourceId: 'abc',
        },
        {
          kind: 'docker-resource',
          cleaner: 'docker-resources',
          path: 'container:def',
          sizeBytes: 0,
          risk: 'medium',
          description: 'ctr',
          dockerType: 'container',
          resourceId: 'def',
        },
        {
          kind: 'docker-resource',
          cleaner: 'docker-resources',
          path: 'volume:ghi',
          sizeBytes: 0,
          risk: 'medium',
          description: 'vol',
          dockerType: 'volume',
          resourceId: 'ghi',
        },
      ],
      force: true,
      dryRun: false,
    });

    expect(result.deleted).toHaveLength(3);
    expect(mockExecCommand).toHaveBeenCalled();
  });
});
