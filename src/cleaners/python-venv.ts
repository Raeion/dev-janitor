import path from 'node:path';
import type { FilesystemCleaner } from '../types.js';

const VENV_DIR_NAMES = new Set(['.venv', 'venv']);

export const pythonVenvCleaner: FilesystemCleaner = {
  name: 'python-venv',
  description: 'Removes Python virtual environments that can be recreated',
  risk: 'low',
  scope: 'filesystem',
  target: 'directory',
  skipChildren: true,
  ageFilterable: true,
  detect(dirPath: string): boolean {
    return VENV_DIR_NAMES.has(path.basename(dirPath));
  },
};
