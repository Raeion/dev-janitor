import type { ScanScope } from './types.js';

export interface SharedCliFlags {
  type?: string;
  scope?: ScanScope;
  force?: boolean;
  dryRun?: boolean;
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;
export const EXIT_CANCELLED = 2;

export function parseSharedFlags(opts: {
  type?: string;
  scope?: string;
  dryRun?: boolean;
  force?: boolean;
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}): SharedCliFlags {
  const flags: SharedCliFlags = {};

  if (opts.type !== undefined) {
    flags.type = opts.type;
  }
  if (opts.scope !== undefined) {
    flags.scope = opts.scope as ScanScope;
  }
  if (opts.dryRun !== undefined) {
    flags.dryRun = opts.dryRun;
  }
  if (opts.force !== undefined) {
    flags.force = opts.force;
  }
  if (opts.json !== undefined) {
    flags.json = opts.json;
  }
  if (opts.quiet !== undefined) {
    flags.quiet = opts.quiet;
  }
  if (opts.verbose !== undefined) {
    flags.verbose = opts.verbose;
  }

  return flags;
}
