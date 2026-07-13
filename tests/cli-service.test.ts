import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatJsonResult,
  printBanner,
  printFindings,
  runListCleanersCommand,
  runScanCommand,
} from '../src/cli-service.js';
import { nodeModulesCleaner } from '../src/cleaners/node-modules.js';
import { EXIT_CANCELLED, EXIT_ERROR, EXIT_SUCCESS } from '../src/cli-options.js';
import type { CleanResult, ScanResult } from '../src/types.js';
import type { LoadedConfig } from '../src/config.js';
import { pathFinding } from './helpers.js';

function mockLoadedConfig(overrides: Partial<LoadedConfig> = {}): LoadedConfig {
  return {
    ignore: [],
    cleaners: [],
    scope: 'filesystem',
    minAgeDays: 0,
    protectedBranches: [],
    gitFetch: false,
    warnings: [],
    ...overrides,
  };
}

function captureConsole(): {
  logs: string[];
  errors: string[];
  restore: () => void;
} {
  const logs: string[] = [];
  const errors: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (value?: unknown) => {
    logs.push(String(value));
  };
  console.error = (value?: unknown) => {
    errors.push(String(value));
  };

  return {
    logs,
    errors,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
    },
  };
}

const sampleFinding = pathFinding({
  cleaner: 'node-modules',
  path: '/tmp/proj/node_modules',
  sizeBytes: 1024,
  risk: 'low',
  description: 'Node dependencies',
});

describe('printBanner', () => {
  it('prints the Dev Janitor header', () => {
    const { logs, restore } = captureConsole();
    try {
      printBanner();
      expect(logs.join('\n')).toContain('Dev Janitor');
    } finally {
      restore();
    }
  });
});

describe('runListCleanersCommand', () => {
  it('returns JSON with listedCleaners', () => {
    const { logs, restore } = captureConsole();
    try {
      const code = runListCleanersCommand({ json: true, quiet: true });
      expect(code).toBe(EXIT_SUCCESS);
      const parsed = JSON.parse(logs[0] ?? '') as { listedCleaners: unknown[] };
      expect(parsed.listedCleaners.length).toBeGreaterThanOrEqual(10);
    } finally {
      restore();
    }
  });

  it('renders a human-readable table', () => {
    const { logs, restore } = captureConsole();
    try {
      const code = runListCleanersCommand({ quiet: false });
      expect(code).toBe(EXIT_SUCCESS);
      const output = logs.join('\n');
      expect(output).toContain('node-modules');
      expect(output).toContain('Dev Janitor');
    } finally {
      restore();
    }
  });

  it('suppresses output when quiet', () => {
    const { logs, restore } = captureConsole();
    try {
      const code = runListCleanersCommand({ quiet: true });
      expect(code).toBe(EXIT_SUCCESS);
      expect(logs).toHaveLength(0);
    } finally {
      restore();
    }
  });
});

describe('printFindings', () => {
  it('prints clean summary for empty findings', () => {
    const { logs, restore } = captureConsole();
    const result: ScanResult = {
      findings: [],
      totalBytes: 0,
      scannedDirs: 1,
      gitRepos: 0,
      skippedCleaners: [],
    };

    try {
      printFindings(result, {});
      expect(logs.join('\n')).toContain('clean');
      expect(logs.join('\n')).toContain('1 directory');
    } finally {
      restore();
    }
  });

  it('prints findings table and reclaimable total', () => {
    const { logs, restore } = captureConsole();
    const result: ScanResult = {
      findings: [sampleFinding],
      totalBytes: 1024,
      scannedDirs: 2,
      gitRepos: 2,
      skippedCleaners: [],
    };

    try {
      printFindings(result, {});
      const output = logs.join('\n');
      expect(output).toContain('node_modules');
      expect(output).toContain('Total reclaimable');
      expect(output).toContain('2 directories');
      expect(output).toContain('2 git repos');
    } finally {
      restore();
    }
  });

  it('prints skipped cleaners when verbose and findings exist', () => {
    const { logs, restore } = captureConsole();
    const result: ScanResult = {
      findings: [sampleFinding],
      totalBytes: 1024,
      scannedDirs: 3,
      gitRepos: 1,
      skippedCleaners: ['docker-resources'],
    };

    try {
      printFindings(result, { verbose: true });
      expect(logs.join('\n')).toContain('docker-resources');
      expect(logs.join('\n')).toContain('1 git repo');
    } finally {
      restore();
    }
  });
});

describe('runScanCommand errors', () => {
  it('returns error exit code for unknown cleaner type in JSON mode', async () => {
    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand(
        '.',
        { json: true, quiet: true, type: 'not-a-cleaner' },
        'scan',
        {
          loadConfig: async () => mockLoadedConfig(),
        },
      );
      expect(code).toBe(EXIT_ERROR);
      const parsed = JSON.parse(logs[0] ?? '') as { error?: string };
      expect(parsed.error).toMatch(/Unknown cleaner/);
    } finally {
      restore();
    }
  });

  it('prints resolver errors in human mode', async () => {
    const { errors, restore } = captureConsole();
    try {
      const code = await runScanCommand(
        '.',
        { quiet: true, type: 'not-a-cleaner' },
        'scan',
        {
          loadConfig: async () => mockLoadedConfig(),
        },
      );
      expect(code).toBe(EXIT_ERROR);
      expect(errors.join('\n')).toMatch(/Unknown cleaner/);
    } finally {
      restore();
    }
  });

  it('surfaces scan failures as JSON error', async () => {
    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand('.', { json: true, quiet: true }, 'scan', {
        loadConfig: async () => mockLoadedConfig(),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => {
          throw new Error('scan exploded');
        },
      });
      expect(code).toBe(EXIT_ERROR);
      const parsed = JSON.parse(logs[0] ?? '') as { error?: string };
      expect(parsed.error).toBe('scan exploded');
    } finally {
      restore();
    }
  });

  it('surfaces scan failures in human mode', async () => {
    const { errors, restore } = captureConsole();
    try {
      const code = await runScanCommand('.', { quiet: false }, 'scan', {
        loadConfig: async () => mockLoadedConfig(),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => {
          throw new Error('scan exploded');
        },
      });
      expect(code).toBe(EXIT_ERROR);
      expect(errors.join('\n')).toContain('scan exploded');
    } finally {
      restore();
    }
  });
});

describe('runScanCommand success paths', () => {
  const scanResult: ScanResult = {
    findings: [sampleFinding],
    totalBytes: 1024,
    scannedDirs: 4,
    gitRepos: 0,
    skippedCleaners: [],
  };

  it('emits a single JSON envelope for scan', async () => {
    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand('.', { json: true, quiet: true }, 'scan', {
        loadConfig: async () => mockLoadedConfig({
          ignore: ['dist'],
          warnings: [{ field: 'cleaners', message: 'removed unknown' }],
        }),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => scanResult,
      });
      expect(code).toBe(EXIT_SUCCESS);
      const parsed = JSON.parse(logs[0] ?? '') as {
        command: string;
        cleaners: string[];
        configWarnings?: unknown[];
        clean?: unknown;
      };
      expect(parsed.command).toBe('scan');
      expect(parsed.cleaners).toEqual(['node-modules']);
      expect(parsed.configWarnings).toHaveLength(1);
      expect(parsed.clean).toBeUndefined();
    } finally {
      restore();
    }
  });

  it('prints scan metadata and clean hint in human mode', async () => {
    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand('my project', { quiet: false }, 'scan', {
        loadConfig: async () => mockLoadedConfig({
          ignore: ['dist'],
          warnings: [{ field: 'cleaners', message: 'removed unknown' }],
        }),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => scanResult,
      });
      expect(code).toBe(EXIT_SUCCESS);
      const output = logs.join('\n');
      expect(output).toContain('Path:');
      expect(output).toContain('node-modules');
      expect(output).toContain('Ignore:');
      expect(output).toContain('dj clean "my project"');
      expect(output).toContain('Dry-run only');
    } finally {
      restore();
    }
  });

  it('prints config warnings when verbose', async () => {
    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand('.', { verbose: true, quiet: false }, 'scan', {
        loadConfig: async () => mockLoadedConfig({
          warnings: [{ field: 'cleaners', message: 'removed unknown' }],
        }),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => scanResult,
      });
      expect(code).toBe(EXIT_SUCCESS);
      expect(logs.join('\n')).toContain('Config warning');
    } finally {
      restore();
    }
  });

  it('forwards scan warnings when verbose', async () => {
    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand('.', { verbose: true, quiet: false }, 'scan', {
        loadConfig: async () => mockLoadedConfig(),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async (options) => {
          options.onWarning?.('docker daemon unavailable');
          return scanResult;
        },
      });
      expect(code).toBe(EXIT_SUCCESS);
      expect(logs.join('\n')).toContain('docker daemon unavailable');
    } finally {
      restore();
    }
  });

  it('invokes onProgress when provided', async () => {
    const progress: string[] = [];
    const code = await runScanCommand('.', { quiet: true }, 'scan', {
      loadConfig: async () => mockLoadedConfig(),
      resolveCleaners: () => [nodeModulesCleaner],
      scan: async (options) => {
        options.onProgress?.('walking files');
        return scanResult;
      },
      onProgress: (message) => {
        progress.push(message);
      },
    });
    expect(code).toBe(EXIT_SUCCESS);
    expect(progress).toEqual(['walking files']);
  });
});

describe('runScanCommand clean mode', () => {
  const scanResult: ScanResult = {
    findings: [sampleFinding],
    totalBytes: 1024,
    scannedDirs: 1,
    gitRepos: 0,
    skippedCleaners: [],
  };

  it('includes clean section in JSON output', async () => {
    const cleanResult: CleanResult = {
      dryRun: true,
      cancelled: false,
      deleted: [],
      failed: [],
      bytesFreed: 0,
      wouldDelete: [sampleFinding.path],
    };

    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand('.', { json: true, quiet: true, dryRun: true }, 'clean', {
        loadConfig: async () => mockLoadedConfig(),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => scanResult,
        executeClean: async () => cleanResult,
      });
      expect(code).toBe(EXIT_SUCCESS);
      const parsed = JSON.parse(logs[0] ?? '') as { clean?: CleanResult };
      expect(parsed.clean?.dryRun).toBe(true);
      expect(parsed.clean?.wouldDelete).toEqual([sampleFinding.path]);
    } finally {
      restore();
    }
  });

  it('prints dry-run message in human mode', async () => {
    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand('.', { quiet: false, dryRun: true }, 'clean', {
        loadConfig: async () => mockLoadedConfig(),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => scanResult,
        executeClean: async () => ({
          dryRun: true,
          cancelled: false,
          deleted: [],
          failed: [],
          bytesFreed: 0,
          wouldDelete: [sampleFinding.path],
        }),
      });
      expect(code).toBe(EXIT_SUCCESS);
      expect(logs.join('\n')).toContain('Dry-run: nothing was deleted');
    } finally {
      restore();
    }
  });

  it('returns cancelled exit code', async () => {
    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand('.', { quiet: false }, 'clean', {
        loadConfig: async () => mockLoadedConfig(),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => scanResult,
        executeClean: async () => ({
          dryRun: false,
          cancelled: true,
          deleted: [],
          failed: [],
          bytesFreed: 0,
          wouldDelete: [sampleFinding.path],
        }),
      });
      expect(code).toBe(EXIT_CANCELLED);
      expect(logs.join('\n')).toContain('Cancelled');
    } finally {
      restore();
    }
  });

  it('prints deleted summary and returns error when deletes fail', async () => {
    const { logs, errors, restore } = captureConsole();
    try {
      const code = await runScanCommand('.', { quiet: false, force: true }, 'clean', {
        loadConfig: async () => mockLoadedConfig(),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => scanResult,
        executeClean: async (options) => {
          options.onDeleteError?.(sampleFinding.path, 'permission denied');
          return {
            dryRun: false,
            cancelled: false,
            deleted: [sampleFinding.path],
            failed: [{ path: '/other', error: 'busy' }],
            bytesFreed: 1024,
            wouldDelete: [sampleFinding.path],
          };
        },
      });
      expect(code).toBe(EXIT_ERROR);
      expect(logs.join('\n')).toContain('Deleted 1 item');
      expect(errors.join('\n')).toContain('Failed to delete');
      expect(errors.join('\n')).toContain('busy');
    } finally {
      restore();
    }
  });

  it('uses unquoted clean hint for paths without spaces', async () => {
    const { logs, restore } = captureConsole();
    try {
      const code = await runScanCommand(path.join('tmp', 'proj'), { quiet: false }, 'scan', {
        loadConfig: async () => mockLoadedConfig(),
        resolveCleaners: () => [nodeModulesCleaner],
        scan: async () => scanResult,
      });
      expect(code).toBe(EXIT_SUCCESS);
      expect(logs.join('\n')).toMatch(/dj clean tmp/);
      expect(logs.join('\n')).not.toContain('"');
    } finally {
      restore();
    }
  });
});

describe('formatJsonResult', () => {
  it('serializes cleaner list metadata', () => {
    const payload = formatJsonResult({
      version: '1.0.0',
      command: 'list-cleaners',
      listedCleaners: [
        {
          name: 'node-modules',
          description: 'test',
          risk: 'low',
          scope: 'filesystem',
          target: 'directory',
          requiresCli: [],
        },
      ],
    });
    expect(payload).toContain('node-modules');
  });
});
