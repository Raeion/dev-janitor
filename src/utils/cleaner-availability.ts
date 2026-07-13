import type { Cleaner } from '../types.js';
import { isCliAvailable } from './cli-deps.js';

export interface CleanerAvailabilityResult {
  available: Cleaner[];
  skipped: string[];
}

export interface CleanerAvailabilityOptions {
  onWarning?: (message: string) => void;
  verbose?: boolean;
}

/**
 * Partition cleaners by external CLI availability.
 * Missing tools are skipped with an optional verbose warning.
 */
export async function partitionByCliAvailability(
  cleaners: Cleaner[],
  options: CleanerAvailabilityOptions = {},
): Promise<CleanerAvailabilityResult> {
  const available: Cleaner[] = [];
  const skipped: string[] = [];

  for (const cleaner of cleaners) {
    const required =
      cleaner.scope === 'git-repo' || cleaner.scope === 'global'
        ? cleaner.requiresCli
        : [];

    let missing = false;

    for (const cli of required) {
      const ok = await isCliAvailable(cli);
      if (!ok) {
        missing = true;
        if (options.verbose) {
          options.onWarning?.(
            `Skipping cleaner "${cleaner.name}": "${cli}" not found on PATH`,
          );
        }
        skipped.push(cleaner.name);
        break;
      }
    }

    if (!missing) {
      available.push(cleaner);
    }
  }

  return { available, skipped };
}
