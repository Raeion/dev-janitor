import { describe, expect, it } from 'vitest';
import { getVersion } from '../src/version.js';

describe('getVersion', () => {
  it('reads version from package.json', () => {
    expect(getVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('returns cached version on subsequent calls', () => {
    expect(getVersion()).toBe(getVersion());
  });
});
