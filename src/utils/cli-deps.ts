import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const availabilityCache = new Map<string, boolean>();

/**
 * Check whether a CLI tool is available on PATH.
 * Results are cached for the process lifetime.
 */
export async function isCliAvailable(cliName: string): Promise<boolean> {
  const cached = availabilityCache.get(cliName);
  if (cached !== undefined) {
    return cached;
  }

  const command = process.platform === 'win32' ? 'where' : 'which';
  try {
    await execFileAsync(command, [cliName], { timeout: 5000 });
    availabilityCache.set(cliName, true);
    return true;
  } catch {
    availabilityCache.set(cliName, false);
    return false;
  }
}

/** Reset cache (for tests). */
export function clearCliAvailabilityCache(): void {
  availabilityCache.clear();
}
