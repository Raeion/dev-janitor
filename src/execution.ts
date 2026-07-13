import { rm } from 'node:fs/promises';
import type { CleanOptions, CleanResult, Finding } from './types.js';
import { execCommand } from './utils/process-exec.js';
import { isPathInside } from './utils/paths.js';
import { validateFindingForDelete } from './utils/validation.js';

/** Drop path findings nested under another path finding. */
export function pruneNestedFindings(findings: Finding[]): Finding[] {
  const pathFindings = findings.filter((f) => f.kind === 'path');
  const otherFindings = findings.filter((f) => f.kind !== 'path');

  const sorted = [...pathFindings].sort((a, b) => a.path.length - b.path.length);
  const kept: Finding[] = [];

  for (const finding of sorted) {
    const nested = kept.some((parent) => isPathInside(finding.path, parent.path));
    if (!nested) {
      kept.push(finding);
    }
  }

  return [...kept, ...otherFindings];
}

async function deletePath(finding: Finding): Promise<void> {
  await rm(finding.path, { recursive: true, force: true });
}

async function deleteGitBranch(finding: Finding): Promise<void> {
  if (!finding.repoRoot || !finding.resourceId) {
    throw new Error('Git finding missing repoRoot or resourceId');
  }
  await execCommand(
    'git',
    ['-C', finding.repoRoot, 'branch', '-d', finding.resourceId],
    { timeout: 30_000 },
  );
}

async function deleteDockerResource(finding: Finding): Promise<void> {
  if (!finding.resourceId || !finding.dockerType) {
    throw new Error('Docker finding missing resourceId or dockerType');
  }

  switch (finding.dockerType) {
    case 'image':
      await execCommand('docker', ['rmi', finding.resourceId], { timeout: 60_000 });
      break;
    case 'container':
      await execCommand('docker', ['rm', finding.resourceId], { timeout: 60_000 });
      break;
    case 'volume':
      await execCommand('docker', ['volume', 'rm', finding.resourceId], { timeout: 60_000 });
      break;
    default: {
      const _exhaustive: never = finding.dockerType;
      throw new Error(`Unknown docker type: ${String(_exhaustive)}`);
    }
  }
}

async function deleteFinding(finding: Finding): Promise<void> {
  switch (finding.kind) {
    case 'path':
      await deletePath(finding);
      break;
    case 'git-branch':
      await deleteGitBranch(finding);
      break;
    case 'docker-resource':
      await deleteDockerResource(finding);
      break;
    default: {
      const _exhaustive: never = finding.kind;
      throw new Error(`Unknown finding kind: ${String(_exhaustive)}`);
    }
  }
}

function emptyCleanResult(dryRun: boolean): CleanResult {
  return {
    deleted: [],
    failed: [],
    bytesFreed: 0,
    cancelled: false,
    dryRun,
    wouldDelete: [],
  };
}

/**
 * Delete findings after confirmation (unless force or dry-run).
 * Library code never writes to stdout/stderr; callers render results.
 * Pass `confirm` when `force` is false and `dryRun` is false.
 */
export async function executeClean(options: CleanOptions): Promise<CleanResult> {
  const { findings, force, dryRun, confirm, allowedRoots, onDeleteError } = options;

  if (findings.length === 0) {
    return emptyCleanResult(dryRun);
  }

  const targets = pruneNestedFindings(findings);
  const wouldDelete = targets.map((f) => f.path);
  const totalBytes = targets.reduce((sum, f) => sum + f.sizeBytes, 0);
  const mediumRiskCount = targets.filter((f) => f.risk === 'medium').length;
  const highRiskCount = targets.filter((f) => f.risk === 'high').length;

  if (dryRun) {
    return { ...emptyCleanResult(true), wouldDelete };
  }

  if (!force) {
    if (!confirm) {
      return { ...emptyCleanResult(false), cancelled: true, wouldDelete };
    }

    const confirmed = await confirm({
      totalBytes,
      count: targets.length,
      mediumRiskCount,
      highRiskCount,
    });
    if (!confirmed) {
      return { ...emptyCleanResult(false), cancelled: true, wouldDelete };
    }
  }

  const deleted: string[] = [];
  const failed: Array<{ path: string; error: string }> = [];
  let bytesFreed = 0;

  const pathTargets = targets
    .filter((f) => f.kind === 'path')
    .sort((a, b) => b.path.split(/[/\\]/).length - a.path.split(/[/\\]/).length);
  const otherTargets = targets.filter((f) => f.kind !== 'path');

  for (const finding of [...pathTargets, ...otherTargets]) {
    const validationError = validateFindingForDelete(finding, allowedRoots);
    if (validationError) {
      failed.push({ path: finding.path, error: validationError });
      onDeleteError?.(finding.path, validationError);
      continue;
    }

    try {
      await deleteFinding(finding);
      deleted.push(finding.path);
      bytesFreed += finding.sizeBytes;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push({ path: finding.path, error: message });
      onDeleteError?.(finding.path, message);
    }
  }

  return {
    deleted,
    failed,
    bytesFreed,
    cancelled: false,
    dryRun: false,
    wouldDelete,
  };
}

export function summarizeFindings(findings: Finding[]): { totalBytes: number; count: number } {
  return {
    totalBytes: findings.reduce((sum, f) => sum + f.sizeBytes, 0),
    count: findings.length,
  };
}
