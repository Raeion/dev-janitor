import { describe, expect, it } from 'vitest';
import { isPathInside, isNestedRepoRoot } from '../src/utils/paths.js';

describe('isPathInside', () => {
  it('detects nested paths on posix-style paths', () => {
    expect(isPathInside('/proj/node_modules/pkg', '/proj/node_modules')).toBe(true);
    expect(isPathInside('/proj/node_modules', '/proj/node_modules')).toBe(false);
    expect(isPathInside('/other/node_modules', '/proj/node_modules')).toBe(false);
  });

  it('is case-insensitive on Windows', () => {
    if (process.platform !== 'win32') {
      return;
    }
    expect(isPathInside('C:\\Proj\\node_modules\\pkg', 'C:\\proj\\node_modules')).toBe(true);
    expect(isPathInside('c:\\proj\\node_modules\\pkg', 'C:\\PROJ\\node_modules')).toBe(true);
  });
});

describe('isNestedRepoRoot', () => {
  it('detects nested repository roots', () => {
    expect(isNestedRepoRoot('/workspace/nested', '/workspace')).toBe(true);
    expect(isNestedRepoRoot('/workspace', '/workspace')).toBe(false);
    expect(isNestedRepoRoot('/other', '/workspace')).toBe(false);
  });
});
