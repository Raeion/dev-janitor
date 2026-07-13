# Cleaners

Cleaners are isolated modules grouped by **scope**: filesystem, git-repo, or global.

## Interface

Defined in `src/types.ts`:

| Field | Purpose |
|---|---|
| `name` | Stable id (`node-modules`) used by `--type` and config |
| `description` | Human-readable summary shown in docs / findings |
| `risk` | `low` \| `medium` \| `high` |
| `scope` | `filesystem` \| `git-repo` \| `global` |
| `target` | `directory` \| `file` (filesystem only) |
| `detect(path)` | Filesystem: returns whether entry is a target |
| `skipChildren` | Filesystem: do not walk inside a directory match |
| `scanRepo(repoRoot)` | Git-repo: return findings for one repository |
| `scanGlobal()` | Global: return findings from daemon-wide scan |
| `requiresCli` | External tools needed (`git`, `docker`) |

## Built-in cleaners

### `node-modules` (filesystem / directory)

| | |
|---|---|
| File | `src/cleaners/node-modules.ts` |
| Target | directories named `node_modules` |
| Risk | low |
| `skipChildren` | true |
| Restore | `npm install` / `yarn` / `pnpm install` |

CLI aliases: `node`, `node-modules`, `nodemodules`.

### `python-cache` (filesystem / directory)

| | |
|---|---|
| File | `src/cleaners/python-cache.ts` |
| Target | `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache` |
| Risk | low |
| `skipChildren` | true |

CLI aliases: `python`, `python-cache`, `pycache`.

### `python-venv` (filesystem / directory)

| | |
|---|---|
| File | `src/cleaners/python-venv.ts` |
| Target | `.venv/`, `venv/` |
| Risk | low |
| `skipChildren` | true |

CLI aliases: `venv`, `python-venv`.

### `ds-store` (filesystem / file)

| | |
|---|---|
| File | `src/cleaners/ds-store.ts` |
| Target | `.DS_Store` files |
| Risk | low |

CLI aliases: `ds`, `ds-store`, `dsstore`.

### `build-artifacts` (filesystem / directory)

| | |
|---|---|
| File | `src/cleaners/build-artifacts.ts` |
| Target | `.next`, `dist`, `build`, `out`, `target`, `.turbo`, `.nx` |
| Risk | low |
| `skipChildren` | true |
| Restore | Rebuild the project (`npm run build`, `cargo build`, etc.) |

CLI aliases: `build`, `build-artifacts`, `artifacts`.

### `git-stale-branches` (git-repo)

| | |
|---|---|
| File | `src/cleaners/git-stale-branches.ts` |
| Target | merged local branches |
| Risk | medium |
| Requires | `git` on PATH |
| Excludes | `main`, `master`, `develop`, `HEAD`, current branch, plus `protectedBranches` from config |

CLI aliases: `git`, `git-stale-branches`, `branches`.

### `docker-resources` (global)

| | |
|---|---|
| File | `src/cleaners/docker-resources.ts` |
| Target | dangling images, exited containers, dangling volumes |
| Risk | medium |
| Requires | `docker` on PATH |

CLI aliases: `docker`, `docker-resources`.

## Registry

`src/cleaners/index.ts` exports:

- `allCleaners` – full list
- `resolveCleaners({ typeFilter, configCleaners })` – selection logic
- `getCleanerByName(name)` – lookup with alias support
- `listCleanerNames()` – canonical names for config validation

## Adding a cleaner

See step-by-step instructions in [../CONTRIBUTING.md](../CONTRIBUTING.md).

## Related docs

- [Configuration](./configuration.md)
- [Architecture](./architecture.md)
