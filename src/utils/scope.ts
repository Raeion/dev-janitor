import type { Cleaner, CleanerScope, ScanScope } from '../types.js';

const SCOPE_TO_CLEANER_SCOPE: Record<Exclude<ScanScope, 'all'>, CleanerScope> = {
  filesystem: 'filesystem',
  git: 'git-repo',
  global: 'global',
};

/** Filter cleaners to a scan scope. `all` returns the list unchanged. */
export function filterCleanersByScope(cleaners: Cleaner[], scope: ScanScope): Cleaner[] {
  if (scope === 'all') {
    return cleaners;
  }

  const cleanerScope = SCOPE_TO_CLEANER_SCOPE[scope];
  return cleaners.filter((cleaner) => cleaner.scope === cleanerScope);
}

const VALID_SCOPES = new Set<ScanScope>(['filesystem', 'git', 'global', 'all']);

export function parseScanScope(value: string | undefined): ScanScope {
  const normalized = (value ?? 'filesystem').trim().toLowerCase();
  if (VALID_SCOPES.has(normalized as ScanScope)) {
    return normalized as ScanScope;
  }

  throw new Error(
    `Unknown scope "${value}". Use filesystem, git, global, or all.`,
  );
}
