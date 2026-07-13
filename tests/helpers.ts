import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';

export const tempDirs: string[] = [];

async function rmWithRetry(target: string, maxAttempts = 5): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true });
      return;
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error
          ? String((error as NodeJS.ErrnoException).code)
          : '';
      const retriable = code === 'EBUSY' || code === 'EPERM' || code === 'ENOTEMPTY';
      if (!retriable || attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
}

export async function createFixture(
  structure: Record<string, string | null>,
): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'dj-test-'));
  tempDirs.push(root);

  for (const [relative, content] of Object.entries(structure)) {
    const full = path.join(root, relative);
    if (content === null) {
      await mkdir(full, { recursive: true });
    } else {
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, content, 'utf8');
    }
  }

  return root;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rmWithRetry(dir);
    }
  }
});

export function pathFinding(
  partial: {
    cleaner: string;
    path: string;
    sizeBytes: number;
    risk: 'low' | 'medium' | 'high';
    description: string;
  },
) {
  return { kind: 'path' as const, ...partial };
}
