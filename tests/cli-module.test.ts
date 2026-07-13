import { describe, expect, it } from 'vitest';
import { buildProgram } from '../src/cli.js';
import { getVersion } from '../src/version.js';
import { createFixture } from './helpers.js';

describe('buildProgram', () => {
  it('registers scan, clean, and list-cleaners commands', () => {
    const program = buildProgram();
    const names = program.commands.map((cmd) => cmd.name());
    expect(names).toContain('scan');
    expect(names).toContain('clean');
    expect(names).toContain('list-cleaners');
  });

  it('exposes package version', () => {
    const program = buildProgram();
    expect(program.version()).toBe(getVersion());
  });

  it('runs scan in JSON mode via commander', async () => {
    const root = await createFixture({
      'app/node_modules/pkg/index.js': 'x',
    });

    const originalExitCode = process.exitCode;
    process.exitCode = undefined;

    const { logs, restore } = captureConsole();
    try {
      await buildProgram().parseAsync(['scan', root, '--type=node', '--json', '--quiet'], {
        from: 'user',
      });
      expect(process.exitCode ?? 0).toBe(0);
      const parsed = JSON.parse(logs[0] ?? '') as { findings: unknown[] };
      expect(parsed.findings.length).toBe(1);
    } finally {
      restore();
      process.exitCode = originalExitCode;
    }
  });

  it('runs list alias', async () => {
    const originalExitCode = process.exitCode;
    process.exitCode = undefined;

    const { logs, restore } = captureConsole();
    try {
      await buildProgram().parseAsync(['list', '--json', '--quiet'], { from: 'user' });
      expect(process.exitCode ?? 0).toBe(0);
      const parsed = JSON.parse(logs[0] ?? '') as { listedCleaners: unknown[] };
      expect(parsed.listedCleaners.length).toBeGreaterThan(0);
    } finally {
      restore();
      process.exitCode = originalExitCode;
    }
  });

  it('runs human scan with spinner callbacks', async () => {
    const root = await createFixture({
      'app/node_modules/pkg/index.js': 'x',
    });

    const originalExitCode = process.exitCode;
    process.exitCode = undefined;

    const { logs, restore } = captureConsole();
    try {
      await buildProgram().parseAsync(['scan', root, '--type=node'], { from: 'user' });
      expect(process.exitCode ?? 0).toBe(0);
      const output = logs.join('\n');
      expect(output).toContain('Dev Janitor');
      expect(output).toContain('node_modules');
      expect(output).toContain('Total reclaimable');
    } finally {
      restore();
      process.exitCode = originalExitCode;
    }
  });
});

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
