import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

let cachedVersion: string | undefined;

/** Read package version from package.json (cached). */
export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  const dir = path.dirname(fileURLToPath(import.meta.url));
  const pkgPath = path.join(dir, '..', 'package.json');
  const raw = readFileSync(pkgPath, 'utf8') as string;
  const pkg = JSON.parse(raw) as { version: string };
  cachedVersion = pkg.version;
  return cachedVersion;
}
