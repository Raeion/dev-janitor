import { describe, expect, it } from 'vitest';
import {
  buildProtectedBranchSet,
  parseBranchLines,
  PROTECTED_BRANCHES,
} from '../src/cleaners/git-stale-branches.js';

describe('parseBranchLines', () => {
  it('parses porcelain format output', () => {
    expect(parseBranchLines('feature-a\n\nfeature-b\n')).toEqual(['feature-a', 'feature-b']);
  });

  it('protects default branch names', () => {
    expect(PROTECTED_BRANCHES.has('main')).toBe(true);
    expect(PROTECTED_BRANCHES.has('master')).toBe(true);
  });

  it('merges extra protected branches', () => {
    const branches = buildProtectedBranchSet(['trunk', '']);
    expect(branches.has('trunk')).toBe(true);
    expect(branches.has('main')).toBe(true);
  });
});
