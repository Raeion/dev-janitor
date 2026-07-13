# API Reference

Programmatic usage of `dev-janitor` without the CLI.

## Install

```bash
npm install dev-janitor
```

## Scan

```ts
import { loadConfig, resolveCleaners, scan } from 'dev-janitor';

const config = await loadConfig(process.cwd());
const cleaners = resolveCleaners({ configCleaners: config.cleaners });

const result = await scan({
  rootPath: '.',
  cleaners,
  ignore: config.ignore,
  scope: config.scope,
  minAgeDays: config.minAgeDays,
  protectedBranches: config.protectedBranches,
  verbose: true,
  onWarning: (message) => console.warn(message),
});

console.log(result.findings, result.totalBytes);
```

`scan()` returns pruned findings. Nested path findings under another matched path are removed before totals are calculated.

## Clean

```ts
import { executeClean, createInteractiveConfirm } from 'dev-janitor';

const cleanResult = await executeClean({
  findings: result.findings,
  force: false,
  dryRun: false,
  confirm: createInteractiveConfirm(),
  onDeleteError: (itemPath, error) => {
    console.error(itemPath, error);
  },
});
```

`executeClean()` never writes to stdout or stderr. Pass `confirm` when `force` is false and `dryRun` is false. Without `confirm`, the operation is cancelled (fail-closed for library callers).

Pass `allowedRoots` to refuse path deletes and git branch deletes outside those directories. The CLI sets scan path and `$HOME`. An empty array refuses all path/git-root deletes. Omit the option to skip bound checks.

## JSON CLI contract

`dj scan --json` and `dj clean --json` emit exactly one JSON document:

```json
{
  "version": "1.0.0",
  "command": "clean",
  "path": "/abs/path",
  "cleaners": ["node-modules"],
  "scope": "filesystem",
  "findings": [],
  "totalBytes": 0,
  "scannedDirs": 1,
  "gitRepos": 0,
  "skippedCleaners": [],
  "warnings": [],
  "clean": {
    "dryRun": true,
    "cancelled": false,
    "deleted": [],
    "failed": [],
    "bytesFreed": 0,
    "wouldDelete": []
  }
}
```

## Types

See [`src/types.ts`](../src/types.ts) for `Cleaner`, `Finding`, `ScanResult`, `CleanResult`, and `JsonCommandResult`.

## Related docs

- [Architecture](./architecture.md)
- [Cleaners](./cleaners.md)
- [Configuration](./configuration.md)
