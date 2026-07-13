import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { dockerResourcesCleaner } from '../src/cleaners/docker-resources.js';
import { isCliAvailable } from '../src/utils/cli-deps.js';

const execFileAsync = promisify(execFile);

const dockerAvailable = await isCliAvailable('docker');

async function dockerOk(): Promise<boolean> {
  if (!dockerAvailable) {
    return false;
  }
  try {
    await execFileAsync('docker', ['info'], { timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
}

const dockerRunning = await dockerOk();

describe.skipIf(!dockerRunning)('docker-resources cleaner', () => {
  it('scanGlobal returns findings array', async () => {
    const findings = await dockerResourcesCleaner.scanGlobal!();
    expect(Array.isArray(findings)).toBe(true);
    for (const finding of findings) {
      expect(finding.kind).toBe('docker-resource');
      expect(finding.cleaner).toBe('docker-resources');
      expect(finding.dockerType).toBeDefined();
      expect(finding.resourceId).toBeDefined();
    }
  });
});
