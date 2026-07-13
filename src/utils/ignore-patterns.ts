import micromatch from 'micromatch';
import type { ConfigValidationWarning } from '../types.js';

export function sanitizeIgnorePatterns(patterns: string[]): {
  ignore: string[];
  warnings: ConfigValidationWarning[];
} {
  const ignore: string[] = [];
  const warnings: ConfigValidationWarning[] = [];

  for (const pattern of patterns) {
    if (!pattern.trim()) {
      warnings.push({
        field: 'ignore',
        message: 'Ignore glob pattern cannot be empty',
      });
      continue;
    }

    try {
      micromatch.makeRe(pattern, { dot: true });
      ignore.push(pattern);
    } catch {
      warnings.push({
        field: 'ignore',
        message: `Invalid ignore glob pattern: "${pattern}"`,
      });
    }
  }

  return { ignore, warnings };
}

/** Non-empty ignore patterns safe to pass to micromatch.isMatch. */
export function usableIgnorePatterns(patterns: string[]): string[] {
  return sanitizeIgnorePatterns(patterns).ignore;
}
