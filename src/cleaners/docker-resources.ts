import type { GlobalCleaner, Finding, DockerResourceType } from '../types.js';
import { execCommand } from '../utils/process-exec.js';

export function parseDockerIds(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSize(stdout: string): number {
  const value = Number.parseInt(stdout.trim(), 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function dockerResourceSizeBytes(
  resourceId: string,
  dockerType: DockerResourceType,
): Promise<number> {
  try {
    switch (dockerType) {
      case 'image': {
        const { stdout } = await execCommand(
          'docker',
          ['image', 'inspect', resourceId, '--format', '{{.Size}}'],
          { timeout: 30_000 },
        );
        return parseSize(stdout);
      }
      case 'container': {
        const { stdout } = await execCommand(
          'docker',
          ['inspect', resourceId, '--format', '{{.SizeRw}}'],
          { timeout: 30_000 },
        );
        return parseSize(stdout);
      }
      case 'volume': {
        const { stdout } = await execCommand(
          'docker',
          ['system', 'df', '-v', '--format', '{{.Size}}', '--filter', `volume=${resourceId}`],
          { timeout: 30_000 },
        );
        return parseSize(stdout);
      }
      default: {
        const _exhaustive: never = dockerType;
        return _exhaustive;
      }
    }
  } catch {
    return 0;
  }
}

async function listDanglingImages(): Promise<string[]> {
  try {
    const { stdout } = await execCommand('docker', ['images', '-f', 'dangling=true', '-q'], {
      timeout: 60_000,
    });
    return parseDockerIds(stdout);
  } catch {
    return [];
  }
}

async function listExitedContainers(): Promise<string[]> {
  try {
    const { stdout } = await execCommand('docker', ['ps', '-a', '-f', 'status=exited', '-q'], {
      timeout: 60_000,
    });
    return parseDockerIds(stdout);
  } catch {
    return [];
  }
}

async function listDanglingVolumes(): Promise<string[]> {
  try {
    const { stdout } = await execCommand('docker', ['volume', 'ls', '-f', 'dangling=true', '-q'], {
      timeout: 60_000,
    });
    return parseDockerIds(stdout);
  } catch {
    return [];
  }
}

async function dockerFinding(
  resourceId: string,
  dockerType: DockerResourceType,
  description: string,
): Promise<Finding> {
  const shortId = resourceId.length > 12 ? resourceId.slice(0, 12) : resourceId;
  const sizeBytes = await dockerResourceSizeBytes(resourceId, dockerType);
  const risk = dockerType === 'volume' ? 'high' : 'medium';

  return {
    kind: 'docker-resource',
    cleaner: 'docker-resources',
    path: `${dockerType}:${shortId}`,
    sizeBytes,
    risk,
    description,
    dockerType,
    resourceId,
  };
}

export const dockerResourcesCleaner: GlobalCleaner = {
  name: 'docker-resources',
  description: 'Removes dangling Docker images, exited containers, and dangling volumes',
  risk: 'medium',
  scope: 'global',
  requiresCli: ['docker'],
  async scanGlobal(): Promise<Finding[]> {
    const findings: Finding[] = [];

    const images = await listDanglingImages();
    for (const id of images) {
      findings.push(
        await dockerFinding(id, 'image', `Dangling Docker image ${id.slice(0, 12)}`),
      );
    }

    const containers = await listExitedContainers();
    for (const id of containers) {
      findings.push(
        await dockerFinding(id, 'container', `Exited Docker container ${id.slice(0, 12)}`),
      );
    }

    const volumes = await listDanglingVolumes();
    for (const id of volumes) {
      findings.push(
        await dockerFinding(id, 'volume', `Dangling Docker volume ${id}`),
      );
    }

    return findings;
  },
};
