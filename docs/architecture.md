# Architecture

Dev Janitor is a TypeScript (ESM) CLI with a plug-and-play cleaner system supporting three scopes.

## Module map

```text
CLI entry (cli.ts)                    Commander wiring, spinner, exit codes
  -> CLI service (cli-service.ts)     scan/clean/list orchestration, human + JSON output
  -> Config (config.ts)               loads .janitorrc via cosmiconfig, sanitizes unknown cleaners
  -> Cleaner registry (cleaners/)     resolves --type / config / all; type-guards by scope
  -> Scan orchestrator                merges phases, prunes nested path findings
       -> Filesystem scanner          walks dirs + files, discovers .git (dir or submodule file)
       -> Repo scanner                 git-repo cleaners per discovered repository
       -> Global scanner               global cleaners once (Docker)
  -> Execution engine                 confirms + deletes by Finding.kind; no console I/O
  -> Utilities
       paths.ts                       Windows-safe path nesting checks
       cleaner-availability.ts         shared CLI dependency checks
       ignore-patterns.ts              sanitize ignore globs at load and scan time
       scan-callbacks.ts               optional callback wiring without undefined props
```

## Data flow

1. User runs `dj scan|clean|list-cleaners [path]` with optional flags.
2. Config is loaded from the target path upward (`.janitorrc`, `janitor.config.*`).
3. Cleaners are selected: CLI `--type` wins, else config `cleaners`, else all registered.
4. Scan scope resolves: CLI `--scope` > config `scope` > inferred from config `cleaners` > **`filesystem` default**.
5. Filesystem scanner walks directories and files, skipping ignore globs and `skipChildren` hits.
6. Git repo roots are collected when `.git` directories are found (not descended into).
7. Repo scanners run when scope is `git` or `all`.
8. Global scanners run when scope is `global` or `all`.
9. Findings merge into a single sorted list; nested path findings are pruned before totals and deletion.
10. `scan` always stops there. `clean` prompts (unless `--force`) then deletes by kind.
11. JSON mode emits one document per invocation (see [api.md](./api.md)).

## Finding kinds

| Kind | Delete action |
|---|---|
| `path` | `fs.rm({ recursive: true, force: true })` |
| `git-branch` | `git -C <repo> branch -d <branch>` |
| `docker-resource` | `docker rmi` / `docker rm` / `docker volume rm` |

## Safety model

- `scan` never deletes.
- `clean` defaults to interactive confirmation (`initial: false`).
- High-risk batches (git branches, docker volumes) require typing `DELETE`.
- **Default scope is `filesystem`** so `dj scan .` does not touch Docker or Git unless opted in.
- `--dry-run` on `clean` reports only.
- `--force` skips the prompt for automation.
- CLI path deletes are bound to the scan root and `$HOME` (for global package caches).
- When `allowedRoots` is set on `executeClean`, path findings and git `repoRoot` must fall under those roots; empty roots refuse deletes.
- Permission errors on individual directories are skipped during scan; delete failures are reported without aborting the whole batch.
- Size walks use `lstat` (symlinks are not followed). Walk skips symbolic links.
- Path findings nested under another selected path are pruned before deletion.
- Git cleaner only removes merged local branches; protected names and current branch are excluded.
- Cleaners with missing CLI dependencies are skipped (verbose mode explains why).

## Extension point

Implement the `Cleaner` discriminated union in `src/types.ts` and register in `src/cleaners/index.ts`. Scope-specific helpers live in `src/cleaners/type-guards.ts`.

| Scope | Required fields |
|---|---|
| `filesystem` | `target`, `detect` |
| `git-repo` | `requiresCli: ['git']`, `scanRepo` |
| `global` | `requiresCli`, `scanGlobal` |

External npm plugin loading is not in v1.0; all cleaners are reviewed built-ins.

## Performance note

Matched directories with `skipChildren` are sized via an inline `measureSubtreeBytes` walk in `scanner.ts`, avoiding a separate `getSizeBytes` import during discovery. If profiling later shows walk/size as a bottleneck, extract scanning behind an interface without changing the cleaner contract.

## Related docs

- [Configuration](./configuration.md)
- [Cleaners](./cleaners.md)
- [API reference](./api.md)
- [Changelog](./changelog.md)
