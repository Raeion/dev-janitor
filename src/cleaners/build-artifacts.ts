import path from 'node:path';
import type { FilesystemCleaner } from '../types.js';

/** Common rebuildable build output and monorepo cache directories. */
export const BUILD_ARTIFACT_DIR_NAMES = new Set([
  '.next',
  'dist',
  'build',
  'out',
  'target',
  '.turbo',
  '.nx',
]);

export const buildArtifactsCleaner: FilesystemCleaner = {
  name: 'build-artifacts',
  description:
    'Removes rebuildable output and cache dirs (.next, dist, build, out, target, .turbo, .nx)',
  risk: 'low',
  scope: 'filesystem',
  target: 'directory',
  skipChildren: true,
  ageFilterable: true,
  detect(dirPath: string): boolean {
    return BUILD_ARTIFACT_DIR_NAMES.has(path.basename(dirPath));
  },
};
