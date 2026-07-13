import path from 'node:path';
import type { FilesystemCleaner } from '../types.js';

export const TOOLING_CACHE_DIR_NAMES = new Set([
  '.parcel-cache',
  '.vite',
  '.nuxt',
  '.svelte-kit',
  '.terraform',
  '.terragrunt-cache',
  'DerivedData',
]);

export const toolingCachesCleaner: FilesystemCleaner = {
  name: 'tooling-caches',
  description:
    'Removes framework and infra cache dirs (.vite, .nuxt, .terraform, DerivedData, etc.)',
  risk: 'low',
  scope: 'filesystem',
  target: 'directory',
  skipChildren: true,
  ageFilterable: true,
  detect(dirPath: string): boolean {
    return TOOLING_CACHE_DIR_NAMES.has(path.basename(dirPath));
  },
};
