import { describe, expect, it } from 'vitest';
import { formatBytes, getSizeBytes } from '../src/utils/size.js';
import { createFixture } from './helpers.js';

describe('formatBytes', () => {
  it('formats common sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });
});

describe('getSizeBytes', () => {
  it('sums nested file sizes', async () => {
    const root = await createFixture({
      'a.txt': 'hello',
      'nested/b.txt': 'world!',
    });
    const size = await getSizeBytes(root);
    expect(size).toBe(5 + 6);
  });
});
