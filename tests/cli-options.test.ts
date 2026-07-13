import { describe, expect, it } from 'vitest';
import { parseSharedFlags, EXIT_SUCCESS, EXIT_ERROR, EXIT_CANCELLED } from '../src/cli-options.js';

describe('parseSharedFlags', () => {
  it('parses all flags when provided', () => {
    const flags = parseSharedFlags({
      type: 'node',
      dryRun: true,
      force: true,
      json: true,
      quiet: true,
      verbose: true,
    });
    expect(flags).toEqual({
      type: 'node',
      dryRun: true,
      force: true,
      json: true,
      quiet: true,
      verbose: true,
    });
  });

  it('returns empty object when no flags provided', () => {
    expect(parseSharedFlags({})).toEqual({});
  });
});

describe('exit codes', () => {
  it('defines stable exit codes', () => {
    expect(EXIT_SUCCESS).toBe(0);
    expect(EXIT_ERROR).toBe(1);
    expect(EXIT_CANCELLED).toBe(2);
  });
});
