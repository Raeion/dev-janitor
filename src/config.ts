import { cosmiconfig } from 'cosmiconfig';
import type { JanitorConfig, ConfigValidationWarning, ScanScope } from './types.js';
import { listCleanerNames, getCleanerByName, resolveCleanerName } from './cleaners/index.js';
import { sanitizeIgnorePatterns } from './utils/ignore-patterns.js';
import { parseScanScope } from './utils/scope.js';

const DEFAULT_CONFIG: JanitorConfig = {
  ignore: [],
  cleaners: [],
  scope: 'filesystem',
  minAgeDays: 0,
  protectedBranches: [],
  gitFetch: false,
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function normalizeConfig(raw: unknown): JanitorConfig {
  if (raw === null || typeof raw !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  const record = raw as Record<string, unknown>;
  const ignore = isStringArray(record.ignore) ? record.ignore : [];
  const cleaners = isStringArray(record.cleaners) ? record.cleaners : [];
  const protectedBranches = isStringArray(record.protectedBranches)
    ? record.protectedBranches
    : [];

  let scope: ScanScope = DEFAULT_CONFIG.scope;
  if (typeof record.scope === 'string') {
    try {
      scope = parseScanScope(record.scope);
    } catch {
      scope = DEFAULT_CONFIG.scope;
    }
  }

  const minAgeDays = isNonNegativeNumber(record.minAgeDays)
    ? Math.floor(record.minAgeDays)
    : DEFAULT_CONFIG.minAgeDays;

  const gitFetch = typeof record.gitFetch === 'boolean' ? record.gitFetch : DEFAULT_CONFIG.gitFetch;

  return { ignore, cleaners, scope, minAgeDays, protectedBranches, gitFetch };
}

/** Drop unknown cleaner names from config with warnings (runtime uses sanitized list). */
function sanitizeCleanerNames(names: string[]): {
  cleaners: string[];
  warnings: ConfigValidationWarning[];
} {
  const cleaners: string[] = [];
  const warnings: ConfigValidationWarning[] = [];
  const available = listCleanerNames().join(', ');

  for (const name of names) {
    const cleaner = getCleanerByName(name);
    if (cleaner) {
      cleaners.push(cleaner.name);
    } else {
      warnings.push({
        field: 'cleaners',
        message: `Unknown cleaner in config: "${name}". Skipped. Available: ${available}`,
      });
    }
  }

  return { cleaners, warnings };
}

export function validateConfig(config: JanitorConfig): ConfigValidationWarning[] {
  const { warnings: ignoreWarnings } = sanitizeIgnorePatterns(config.ignore);
  const { warnings: cleanerWarnings } = sanitizeCleanerNames(config.cleaners);
  return [...ignoreWarnings, ...cleanerWarnings];
}

export interface LoadedConfig extends JanitorConfig {
  warnings: ConfigValidationWarning[];
}

/**
 * Load `.janitorrc` / `janitor.config.*` from `searchFrom` upward.
 * Unknown cleaner names are removed from `cleaners` and reported in `warnings`.
 */
export async function loadConfig(searchFrom: string): Promise<LoadedConfig> {
  const explorer = cosmiconfig('janitor');

  try {
    const result = await explorer.search(searchFrom);
    if (!result || result.isEmpty) {
      const config = { ...DEFAULT_CONFIG };
      return { ...config, warnings: validateConfig(config) };
    }

    const raw = normalizeConfig(result.config);
    const { cleaners, warnings: cleanerWarnings } = sanitizeCleanerNames(raw.cleaners);

    if (raw.cleaners.length > 0 && cleaners.length === 0) {
      const available = listCleanerNames().join(', ');
      throw new Error(
        `No valid cleaners in config. ${cleanerWarnings.map((w) => w.message).join(' ')} Available: ${available}`,
      );
    }

    const { ignore, warnings: ignoreWarnings } = sanitizeIgnorePatterns(raw.ignore);
    const config: JanitorConfig = {
      ignore,
      cleaners,
      scope: raw.scope,
      minAgeDays: raw.minAgeDays,
      protectedBranches: raw.protectedBranches,
      gitFetch: raw.gitFetch,
    };

    return { ...config, warnings: [...ignoreWarnings, ...cleanerWarnings] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load janitor config: ${message}`, { cause: error });
  }
}

/** Resolve a user-provided cleaner name to its canonical registry id. */
export function canonicalCleanerName(name: string): string {
  return resolveCleanerName(name);
}
