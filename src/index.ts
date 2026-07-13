export type {
  Cleaner,
  FilesystemCleaner,
  GitRepoCleaner,
  GlobalCleaner,
  Finding,
  JanitorConfig,
  RiskLevel,
  ScanScope,
  ScanResult,
  CleanResult,
  CleanerScope,
  FilesystemTarget,
  FindingKind,
  DockerResourceType,
  ConfigValidationWarning,
  JsonCommandResult,
  ConfirmDeletionFn,
  ConfirmDeletionDetails,
  GitScanContext,
} from './types.js';
export { scan } from './scan-orchestrator.js';
export { scanFilesystem } from './scanner.js';
export { scanRepos } from './repo-scanner.js';
export { scanGlobal } from './global-scanner.js';
export { loadConfig, validateConfig, canonicalCleanerName } from './config.js';
export type { LoadedConfig } from './config.js';
export {
  allCleaners,
  resolveCleaners,
  getCleanerByName,
  listCleanerNames,
} from './cleaners/index.js';
export {
  isFilesystemCleaner,
  isGitRepoCleaner,
  isGlobalCleaner,
} from './cleaners/type-guards.js';
export { executeClean, pruneNestedFindings, summarizeFindings } from './execution.js';
export { createInteractiveConfirm } from './utils/confirm.js';
export { filterCleanersByScope, parseScanScope } from './utils/scope.js';
export { resolveEffectiveScope, inferScopeFromCleaners } from './cleaners/index.js';
export { runScanCommand, runListCleanersCommand, formatJsonResult } from './cli-service.js';
export { formatBytes, getSizeBytes } from './utils/size.js';
export { measureTreeBytes } from './utils/tree-size.js';
export { mapWithConcurrency } from './utils/parallel.js';
export {
  isSafeGitBranchName,
  isSafeDockerResourceId,
  isPathAllowed,
  validateFindingForDelete,
} from './utils/validation.js';
export { isPathInside, isNestedRepoRoot } from './utils/paths.js';
export { getVersion } from './version.js';
