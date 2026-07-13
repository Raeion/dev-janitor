import path from 'node:path';
import type { FilesystemCleaner } from '../types.js';

export const javaGradleCleaner: FilesystemCleaner = {
  name: 'java-gradle',
  description: 'Removes local Gradle caches (.gradle) that rebuild on next compile',
  risk: 'low',
  scope: 'filesystem',
  target: 'directory',
  skipChildren: true,
  ageFilterable: true,
  detect(dirPath: string): boolean {
    return path.basename(dirPath) === '.gradle';
  },
};
