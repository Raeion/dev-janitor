import path from 'node:path';
import type { FilesystemCleaner } from '../types.js';

export const nodeModulesCleaner: FilesystemCleaner = {
  name: 'node-modules',
  description: 'Removes dependency folders that can be restored with npm/yarn/pnpm install',
  risk: 'low',
  scope: 'filesystem',
  target: 'directory',
  skipChildren: true,
  ageFilterable: true,
  detect(dirPath: string): boolean {
    return path.basename(dirPath) === 'node_modules';
  },
};
