import type { Cleaner, ScanScope } from '../types.js';
import { nodeModulesCleaner } from './node-modules.js';
import { pythonCacheCleaner } from './python-cache.js';
import { pythonVenvCleaner } from './python-venv.js';
import { osJunkCleaner } from './os-junk.js';
import { buildArtifactsCleaner } from './build-artifacts.js';
import { toolingCachesCleaner } from './tooling-caches.js';
import { javaGradleCleaner } from './java-gradle.js';
import { gitStaleBranchesCleaner } from './git-stale-branches.js';
import { dockerResourcesCleaner } from './docker-resources.js';
import { packageCachesCleaner } from './package-caches.js';

/** All built-in cleaners. Add new modules here when contributing. */
export const allCleaners: Cleaner[] = [
  nodeModulesCleaner,
  pythonCacheCleaner,
  pythonVenvCleaner,
  osJunkCleaner,
  buildArtifactsCleaner,
  toolingCachesCleaner,
  javaGradleCleaner,
  gitStaleBranchesCleaner,
  dockerResourcesCleaner,
  packageCachesCleaner,
];

const cleanerByName = new Map<string, Cleaner>();
for (const cleaner of allCleaners) {
  cleanerByName.set(cleaner.name, cleaner);
}
cleanerByName.set('ds-store', osJunkCleaner);

/** Short CLI aliases mapped to cleaner names (e.g. --type=node). */
const typeAliases: Record<string, string> = {
  node: 'node-modules',
  'node-modules': 'node-modules',
  nodemodules: 'node-modules',
  python: 'python-cache',
  'python-cache': 'python-cache',
  pycache: 'python-cache',
  venv: 'python-venv',
  'python-venv': 'python-venv',
  ds: 'os-junk',
  'ds-store': 'os-junk',
  'os-junk': 'os-junk',
  osjunk: 'os-junk',
  build: 'build-artifacts',
  'build-artifacts': 'build-artifacts',
  artifacts: 'build-artifacts',
  tooling: 'tooling-caches',
  'tooling-caches': 'tooling-caches',
  java: 'java-gradle',
  'java-gradle': 'java-gradle',
  gradle: 'java-gradle',
  git: 'git-stale-branches',
  'git-stale-branches': 'git-stale-branches',
  branches: 'git-stale-branches',
  docker: 'docker-resources',
  'docker-resources': 'docker-resources',
  caches: 'package-caches',
  'package-caches': 'package-caches',
  npm: 'package-caches',
  pnpm: 'package-caches',
};

export function resolveCleanerName(typeOrName: string): string {
  const key = typeOrName.trim().toLowerCase();
  return typeAliases[key] ?? key;
}

export function getCleanerByName(name: string): Cleaner | undefined {
  return cleanerByName.get(resolveCleanerName(name));
}

export function listCleanerNames(): string[] {
  return allCleaners.map((c) => c.name);
}

/** Infer scan scope from an explicit cleaner list when scope is not set. */
export function inferScopeFromCleaners(cleaners: Cleaner[]): ScanScope {
  const scopes = new Set(cleaners.map((cleaner) => cleaner.scope));
  if (scopes.size !== 1) {
    return 'all';
  }

  const only = [...scopes][0];
  if (only === 'git-repo') {
    return 'git';
  }
  if (only === 'global') {
    return 'global';
  }
  return 'filesystem';
}

/** Resolve scan scope for a CLI run. */
export function resolveEffectiveScope(options: {
  typeFilter?: string | undefined;
  cliScope?: ScanScope | undefined;
  configScope: ScanScope;
  cleaners: Cleaner[];
  configCleaners: string[];
}): ScanScope {
  if (options.typeFilter) {
    return 'all';
  }
  if (options.cliScope) {
    return options.cliScope;
  }
  if (options.configCleaners.length > 0) {
    return inferScopeFromCleaners(options.cleaners);
  }
  return options.configScope;
}

/**
 * Resolve which cleaners to run.
 * Priority: CLI `--type` > config `cleaners` > all registered cleaners.
 */
export function resolveCleaners(options: {
  typeFilter?: string | undefined;
  configCleaners: string[];
}): Cleaner[] {
  const { typeFilter, configCleaners } = options;

  if (typeFilter) {
    const resolved = resolveCleanerName(typeFilter);
    const cleaner = cleanerByName.get(resolved);
    if (!cleaner) {
      const available = allCleaners.map((c) => c.name).join(', ');
      throw new Error(`Unknown cleaner type "${typeFilter}". Available: ${available}`);
    }
    return [cleaner];
  }

  if (configCleaners.length > 0) {
    const selected: Cleaner[] = [];
    for (const name of configCleaners) {
      const cleaner = getCleanerByName(name);
      if (!cleaner) {
        const available = allCleaners.map((c) => c.name).join(', ');
        throw new Error(`Unknown cleaner in config "${name}". Available: ${available}`);
      }
      selected.push(cleaner);
    }
    return selected;
  }

  return [...allCleaners];
}

export {
  nodeModulesCleaner,
  pythonCacheCleaner,
  pythonVenvCleaner,
  osJunkCleaner,
  buildArtifactsCleaner,
  toolingCachesCleaner,
  javaGradleCleaner,
  gitStaleBranchesCleaner,
  dockerResourcesCleaner,
  packageCachesCleaner,
};
