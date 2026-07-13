import path from 'node:path';
import type { FilesystemCleaner } from '../types.js';

const CACHE_DIR_NAMES = new Set([
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
]);

export const pythonCacheCleaner: FilesystemCleaner = {
  name: 'python-cache',
  description: 'Removes Python bytecode and tool cache directories',
  risk: 'low',
  scope: 'filesystem',
  target: 'directory',
  skipChildren: true,
  detect(dirPath: string): boolean {
    return CACHE_DIR_NAMES.has(path.basename(dirPath));
  },
};
