import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { ansi } from './utils/ansi.js';
import { loadConfig } from './config.js';
import { allCleaners, resolveCleaners, resolveEffectiveScope } from './cleaners/index.js';
import { scan } from './scan-orchestrator.js';
import { executeClean } from './execution.js';
import { renderFindingsTable } from './utils/table.js';
import { renderTextTable } from './utils/text-table.js';
import { formatBytes } from './utils/size.js';
import { getVersion } from './version.js';
import { createInteractiveConfirm } from './utils/confirm.js';
import { parseScanScope } from './utils/scope.js';
import {
  EXIT_SUCCESS,
  EXIT_ERROR,
  EXIT_CANCELLED,
  type SharedCliFlags,
} from './cli-options.js';
import type { Cleaner, JsonCommandResult, ScanResult, CleanResult, ScanOptions, CleanOptions, ScanScope } from './types.js';
import { isGitRepoCleaner, isGlobalCleaner } from './cleaners/type-guards.js';

export function printBanner(): void {
  console.log(`${ansi.bold(ansi.cyan('\n  Dev Janitor'))}${ansi.dim('  (dj)')}\n`);
}

export function formatJsonResult(payload: JsonCommandResult): string {
  return JSON.stringify(payload, null, 2);
}

export function printJsonResult(payload: JsonCommandResult): void {
  console.log(formatJsonResult(payload));
}

function cleanerRequiresCli(cleaner: Cleaner): string[] {
  if (isGitRepoCleaner(cleaner) || isGlobalCleaner(cleaner)) {
    return [...cleaner.requiresCli];
  }
  return [];
}

export function printFindings(result: ScanResult, flags: SharedCliFlags): void {
  const { findings, totalBytes, scannedDirs, gitRepos } = result;

  if (findings.length === 0) {
    console.log(ansi.green('No junk found. Your workspace looks clean.'));
    let summary = `Scanned ${scannedDirs} director${scannedDirs === 1 ? 'y' : 'ies'}`;
    if (gitRepos > 0) {
      summary += `, ${gitRepos} git repo${gitRepos === 1 ? '' : 's'}`;
    }
    console.log(ansi.dim(`${summary}.`));
    return;
  }

  console.log(renderFindingsTable(findings));
  console.log();
  console.log(
    ansi.bold('Total reclaimable: ') +
      ansi.yellow(formatBytes(totalBytes)) +
      ansi.dim(` across ${findings.length} item(s)`),
  );
  let summary = `Scanned ${scannedDirs} director${scannedDirs === 1 ? 'y' : 'ies'}`;
  if (gitRepos > 0) {
    summary += `, ${gitRepos} git repo${gitRepos === 1 ? '' : 's'}`;
  }
  console.log(ansi.dim(`${summary}.`));

  if (flags.verbose && result.skippedCleaners.length > 0) {
    console.log(
      ansi.dim(`Skipped cleaners (missing CLI): ${result.skippedCleaners.join(', ')}`),
    );
  }
}

function buildJsonEnvelope(
  command: 'scan' | 'clean',
  rootPath: string,
  cleanerNames: string[],
  result: ScanResult,
  scope: ScanScope,
  configWarnings: JsonCommandResult['configWarnings'],
  warnings: string[],
  clean?: JsonCommandResult['clean'],
): JsonCommandResult {
  const envelope: JsonCommandResult = {
    version: getVersion(),
    command,
    path: rootPath,
    cleaners: cleanerNames,
    scope,
    findings: result.findings,
    totalBytes: result.totalBytes,
    scannedDirs: result.scannedDirs,
    gitRepos: result.gitRepos,
    skippedCleaners: result.skippedCleaners,
    warnings,
  };

  if (configWarnings) {
    envelope.configWarnings = configWarnings;
  }

  if (clean) {
    envelope.clean = clean;
  }

  return envelope;
}

function cleanSectionFromResult(cleanResult: CleanResult): JsonCommandResult['clean'] {
  return {
    dryRun: cleanResult.dryRun,
    cancelled: cleanResult.cancelled,
    deleted: cleanResult.deleted,
    failed: cleanResult.failed,
    bytesFreed: cleanResult.bytesFreed,
    wouldDelete: cleanResult.wouldDelete,
  };
}

export interface RunScanDeps {
  loadConfig?: typeof loadConfig;
  resolveCleaners?: typeof resolveCleaners;
  scan?: typeof scan;
  executeClean?: typeof executeClean;
  onDeleteError?: (itemPath: string, error: string) => void;
  onProgress?: (message: string) => void;
}

export async function runScanCommand(
  targetPath: string,
  flags: SharedCliFlags,
  mode: 'scan' | 'clean',
  deps: RunScanDeps = {},
): Promise<number> {
  const loadConfigFn = deps.loadConfig ?? loadConfig;
  const resolveCleanersFn = deps.resolveCleaners ?? resolveCleaners;
  const scanFn = deps.scan ?? scan;
  const executeCleanFn = deps.executeClean ?? executeClean;

  const rootPath = resolve(targetPath);
  const config = await loadConfigFn(rootPath);

  if (flags.verbose && !flags.json) {
    for (const warning of config.warnings) {
      console.log(ansi.yellow(`Config warning (${warning.field}): ${warning.message}`));
    }
  }

  let cleaners;
  let effectiveScope;
  try {
    cleaners = resolveCleanersFn({
      typeFilter: flags.type,
      configCleaners: config.cleaners,
    });
    const cliScope = flags.scope ? parseScanScope(flags.scope) : undefined;
    effectiveScope = resolveEffectiveScope({
      typeFilter: flags.type,
      cliScope,
      configScope: config.scope,
      cleaners,
      configCleaners: config.cleaners,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (flags.json) {
      printJsonResult({ version: getVersion(), command: mode, error: message });
    } else {
      console.error(ansi.red(message));
    }
    return EXIT_ERROR;
  }

  const warnings: string[] = [];
  const onWarning = (message: string): void => {
    warnings.push(message);
    if (flags.verbose && !flags.json && !flags.quiet) {
      console.log(ansi.yellow(message));
    }
  };

  if (!flags.json && !flags.quiet) {
    console.log(ansi.dim(`Path:     ${rootPath}`));
    console.log(ansi.dim(`Scope:    ${effectiveScope}`));
    console.log(ansi.dim(`Cleaners: ${cleaners.map((c) => c.name).join(', ')}`));
    if (config.ignore.length > 0) {
      console.log(ansi.dim(`Ignore:   ${config.ignore.join(', ')}`));
    }
    console.log();
  }

  let result: ScanResult;
  try {
    const scanOptions: ScanOptions = {
      rootPath,
      cleaners,
      ignore: config.ignore,
      scope: effectiveScope,
      verbose: flags.verbose === true,
      onWarning,
    };
    if (config.minAgeDays > 0) {
      scanOptions.minAgeDays = config.minAgeDays;
    }
    if (config.protectedBranches.length > 0) {
      scanOptions.protectedBranches = config.protectedBranches;
    }
    if (config.gitFetch) {
      scanOptions.gitFetch = true;
    }
    if (deps.onProgress) {
      scanOptions.onProgress = deps.onProgress;
    }
    result = await scanFn(scanOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (flags.json) {
      printJsonResult({ version: getVersion(), command: mode, error: message });
    } else if (!flags.quiet) {
      console.error(ansi.red(message));
    }
    return EXIT_ERROR;
  }

  const cleanerNames = cleaners.map((c) => c.name);
  const dryRun = flags.dryRun === true;
  const force = flags.force === true;

  let cleanResult: CleanResult | undefined;

  if (mode === 'clean' && result.findings.length > 0) {
    // Include home so global path cleaners (package-caches) can delete under $HOME.
    const allowedRoots = [...new Set([rootPath, resolve(homedir())])];
    const cleanOptions: CleanOptions = {
      findings: result.findings,
      force,
      dryRun,
      allowedRoots,
    };
    if (!force && !dryRun) {
      cleanOptions.confirm = createInteractiveConfirm();
    }
    if (deps.onDeleteError) {
      cleanOptions.onDeleteError = deps.onDeleteError;
    }
    cleanResult = await executeCleanFn(cleanOptions);
  }

  if (flags.json) {
    const envelope = buildJsonEnvelope(
      mode,
      rootPath,
      cleanerNames,
      result,
      effectiveScope,
      config.warnings,
      warnings,
      cleanResult ? cleanSectionFromResult(cleanResult) : undefined,
    );
    printJsonResult(envelope);
  } else if (!flags.quiet) {
    printFindings(result, flags);

    if (mode === 'scan' && result.findings.length > 0) {
      const cleanHint =
        /\s/.test(targetPath) ? `dj clean "${targetPath}"` : `dj clean ${targetPath}`;
      console.log();
      console.log(
        ansi.dim('Dry-run only. Run ') +
          ansi.cyan(cleanHint) +
          ansi.dim(' to remove after confirmation.'),
      );
    }

    if (mode === 'clean') {
      if (dryRun && result.findings.length > 0) {
        console.log();
        console.log(ansi.yellow('Dry-run: nothing was deleted.'));
      }

      if (cleanResult?.cancelled) {
        console.log(ansi.yellow('Cancelled. Nothing was deleted.'));
      }

      if (cleanResult && cleanResult.deleted.length > 0) {
        console.log(
          ansi.green(
            `Deleted ${cleanResult.deleted.length} item(s), freed ${formatBytes(cleanResult.bytesFreed)}.`,
          ),
        );
      }

      if (cleanResult) {
        for (const failure of cleanResult.failed) {
          console.error(ansi.red(`Failed to delete ${failure.path}: ${failure.error}`));
        }
      }
    }
  }

  if (mode === 'clean' && cleanResult) {
    if (cleanResult.cancelled) {
      return EXIT_CANCELLED;
    }
    if (cleanResult.failed.length > 0) {
      return EXIT_ERROR;
    }
  }

  return EXIT_SUCCESS;
}

export function runListCleanersCommand(flags: SharedCliFlags): number {
  if (flags.json) {
    printJsonResult({
      version: getVersion(),
      command: 'list-cleaners',
      listedCleaners: allCleaners.map((c) => {
        const entry: NonNullable<JsonCommandResult['listedCleaners']>[number] = {
          name: c.name,
          description: c.description,
          risk: c.risk,
          scope: c.scope,
          requiresCli: cleanerRequiresCli(c),
        };
        if (c.scope === 'filesystem') {
          entry.target = c.target;
        }
        return entry;
      }),
    });
    return EXIT_SUCCESS;
  }

  if (!flags.quiet) {
    printBanner();
  }

  const table = renderTextTable({
    headers: [
      ansi.cyan('Name'),
      ansi.cyan('Scope'),
      ansi.cyan('Risk'),
      ansi.cyan('Requires'),
      ansi.cyan('Description'),
    ],
    widths: [20, 12, 8, 10, 36],
    rows: allCleaners.map((cleaner) => {
      const requires = cleanerRequiresCli(cleaner);
      return [
        cleaner.name,
        cleaner.scope,
        cleaner.risk,
        requires.length > 0 ? requires.join(', ') : '-',
        cleaner.description,
      ];
    }),
  });

  if (!flags.quiet) {
    console.log(table);
    console.log();
  }

  return EXIT_SUCCESS;
}
