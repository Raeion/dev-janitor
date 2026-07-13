import type { Cleaner, Finding } from './types.js';
import { partitionByCliAvailability, type CleanerAvailabilityOptions } from './utils/cleaner-availability.js';
import { globalCleaners } from './cleaners/type-guards.js';
import type { ScanCallbacks } from './utils/scan-callbacks.js';

export interface GlobalScanOptions extends ScanCallbacks {
  cleaners: Cleaner[];
}

export interface GlobalScanResult {
  findings: Finding[];
  skippedCleaners: string[];
}

/** Run global scoped cleaners once per scan (e.g. Docker daemon). */
export async function scanGlobal(options: GlobalScanOptions): Promise<GlobalScanResult> {
  const cleaners = globalCleaners(options.cleaners);
  const availabilityOptions: CleanerAvailabilityOptions = {};
  if (options.onWarning) {
    availabilityOptions.onWarning = options.onWarning;
  }
  if (options.verbose !== undefined) {
    availabilityOptions.verbose = options.verbose;
  }
  const { available: availableNames, skipped } = await partitionByCliAvailability(
    cleaners,
    availabilityOptions,
  );
  const available = cleaners.filter((cleaner) => availableNames.includes(cleaner));

  const findings: Finding[] = [];

  for (const cleaner of available) {
    options.onProgress?.(`Running global cleaner ${cleaner.name}`);

    try {
      const globalFindings = await cleaner.scanGlobal();
      findings.push(...globalFindings);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.onWarning?.(`Global cleaner "${cleaner.name}" failed: ${message}`);
    }
  }

  return { findings, skippedCleaners: skipped };
}
