import { describe, expect, it } from 'vitest';
import { pickScanCallbacks } from '../src/utils/scan-callbacks.js';
import type { ScanOptions } from '../src/types.js';

describe('pickScanCallbacks', () => {
  it('copies only defined callback fields', () => {
    const onProgress = (): void => {};
    const onWarning = (): void => {};

    const options: ScanOptions = {
      rootPath: '/tmp',
      cleaners: [],
      ignore: [],
      onProgress,
      onWarning,
      verbose: true,
    };

    expect(pickScanCallbacks(options)).toEqual({
      onProgress,
      onWarning,
      verbose: true,
    });
  });

  it('returns an empty object when no callbacks are set', () => {
    const options: ScanOptions = {
      rootPath: '/tmp',
      cleaners: [],
      ignore: [],
    };

    expect(pickScanCallbacks(options)).toEqual({});
  });
});
