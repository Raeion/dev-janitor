#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import { getVersion } from './version.js';
import { parseSharedFlags, EXIT_ERROR } from './cli-options.js';
import { runListCleanersCommand, runScanCommand, printBanner } from './cli-service.js';
import { ansi } from './utils/ansi.js';
import { createSpinner } from './utils/spinner.js';

export function buildProgram(): Command {
  const program = new Command();

  program
    .name('dj')
    .description('Dev Janitor: scan and safely clean developer debris from your machine')
    .version(getVersion());

  const sharedOptions = (command: Command): void => {
    command
      .option('-t, --type <cleaner>', 'only run a specific cleaner (e.g. node)')
      .option(
        '-s, --scope <scope>',
        'scan scope: filesystem (default), git, global, or all',
      )
      .option('--json', 'output machine-readable JSON', false)
      .option('--quiet', 'suppress non-error output', false)
      .option('--verbose', 'show skipped cleaners and warnings', false);
  };

  const runWithSpinner = async (
    targetPath: string,
    flags: ReturnType<typeof parseSharedFlags>,
    mode: 'scan' | 'clean',
  ): Promise<number> => {
    if (!flags.quiet && !flags.json) {
      printBanner();
    }

    const spinner = !flags.json && !flags.quiet ? createSpinner('Scanning for developer debris...') : undefined;
    if (spinner) {
      spinner.start();
    }

    const code = await runScanCommand(targetPath, flags, mode, {
      onProgress: (message) => {
        if (spinner) {
          spinner.text = message;
        }
      },
      onDeleteError: (itemPath, message) => {
        if (!flags.json) {
          console.error(ansi.red(`Failed to delete ${itemPath}: ${message}`));
        }
      },
    });

    if (spinner && !flags.json) {
      spinner.succeed('Scan complete');
    }

    return code;
  };

  const scanCmd = program
    .command('scan')
    .description('Scan a directory for junk (never deletes)')
    .argument('[path]', 'directory to scan', '.');
  sharedOptions(scanCmd);
  scanCmd.action(async (targetPath: string, opts) => {
    const flags = parseSharedFlags(opts);
    process.exitCode = await runWithSpinner(targetPath, flags, 'scan');
  });

  const cleanCmd = program
    .command('clean')
    .description('Scan and delete junk after confirmation')
    .argument('[path]', 'directory to clean', '.')
    .option('--dry-run', 'report what would be deleted without deleting', false)
    .option('--force', 'delete without interactive confirmation', false);
  sharedOptions(cleanCmd);
  cleanCmd.action(async (targetPath: string, opts) => {
    const flags = parseSharedFlags(opts);
    process.exitCode = await runWithSpinner(targetPath, flags, 'clean');
  });

  program
    .command('list-cleaners')
    .alias('list')
    .description('List all built-in cleaners')
    .option('--json', 'output machine-readable JSON', false)
    .option('--quiet', 'suppress non-error output', false)
    .action((opts) => {
      const flags = parseSharedFlags(opts);
      process.exitCode = runListCleanersCommand(flags);
    });

  return program;
}

async function main(): Promise<void> {
  const program = buildProgram();
  await program.parseAsync(process.argv);
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(ansi.red(message));
    process.exitCode = EXIT_ERROR;
  });
}
