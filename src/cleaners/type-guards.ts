import type {
  Cleaner,
  FilesystemCleaner,
  GitRepoCleaner,
  GlobalCleaner,
} from '../types.js';

export function isFilesystemCleaner(cleaner: Cleaner): cleaner is FilesystemCleaner {
  return cleaner.scope === 'filesystem';
}

export function isGitRepoCleaner(cleaner: Cleaner): cleaner is GitRepoCleaner {
  return cleaner.scope === 'git-repo';
}

export function isGlobalCleaner(cleaner: Cleaner): cleaner is GlobalCleaner {
  return cleaner.scope === 'global';
}

export function filesystemCleaners(cleaners: Cleaner[]): FilesystemCleaner[] {
  return cleaners.filter(isFilesystemCleaner);
}

export function directoryCleaners(cleaners: Cleaner[]): FilesystemCleaner[] {
  return filesystemCleaners(cleaners).filter((c) => c.target === 'directory');
}

export function fileCleaners(cleaners: Cleaner[]): FilesystemCleaner[] {
  return filesystemCleaners(cleaners).filter((c) => c.target === 'file');
}

export function gitRepoCleaners(cleaners: Cleaner[]): GitRepoCleaner[] {
  return cleaners.filter(isGitRepoCleaner);
}

export function globalCleaners(cleaners: Cleaner[]): GlobalCleaner[] {
  return cleaners.filter(isGlobalCleaner);
}
