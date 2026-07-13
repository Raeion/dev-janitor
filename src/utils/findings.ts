import type { Finding } from '../types.js';

/** Create a filesystem path finding with defaults. */
export function pathFinding(
  partial: Omit<Finding, 'kind'> & { kind?: 'path' },
): Finding {
  return { kind: 'path', ...partial };
}
