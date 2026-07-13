import path from 'node:path';
import type { FilesystemCleaner } from '../types.js';

const OS_JUNK_FILE_NAMES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
]);

export const osJunkCleaner: FilesystemCleaner = {
  name: 'os-junk',
  description: 'Removes OS metadata junk (.DS_Store, Thumbs.db, desktop.ini)',
  risk: 'low',
  scope: 'filesystem',
  target: 'file',
  detect(filePath: string): boolean {
    return OS_JUNK_FILE_NAMES.has(path.basename(filePath));
  },
};

/** @deprecated Use osJunkCleaner. Kept for registry alias `ds-store`. */
export const dsStoreCleaner = osJunkCleaner;
