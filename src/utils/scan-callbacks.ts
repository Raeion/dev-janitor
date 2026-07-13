import type { ScanOptions } from '../types.js';

export interface ScanCallbacks {
  onProgress?: (message: string) => void;
  onWarning?: (message: string) => void;
  verbose?: boolean;
}

/** Pick optional scan callbacks without passing explicit `undefined` values. */
export function pickScanCallbacks(options: ScanOptions): ScanCallbacks {
  const callbacks: ScanCallbacks = {};

  if (options.onProgress) {
    callbacks.onProgress = options.onProgress;
  }
  if (options.onWarning) {
    callbacks.onWarning = options.onWarning;
  }
  if (options.verbose !== undefined) {
    callbacks.verbose = options.verbose;
  }

  return callbacks;
}
