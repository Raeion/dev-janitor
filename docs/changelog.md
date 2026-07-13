# Changelog

## v1.2.1 (2026-07-14)

Public-release safety fixes from pre-publish review.

### Fixed

- Git branch findings now report `risk: high` so interactive clean requires typing `DELETE` (matched docs and cleaner risk)
- CLI `allowedRoots` includes the user home directory so `package-caches` can delete under `$HOME`
- Git `repoRoot` must resolve under `allowedRoots` when roots are set
- Empty `allowedRoots` is fail-closed (no path deletes)
- Regenerated `package-lock.json` with npm 10 so GitHub Actions `npm ci` stays in sync (`@emnapi/*`)
- Path-boundary validation tests use OS-neutral temp paths (Windows drive letters broke Linux/macOS CI)

### Changed

- Repository URLs point to `https://github.com/Raeion/dev-janitor`
- Node engines raised to `>=22.12.0` (matches `commander@15` and current lint/test toolchain)
- CI matrix is Node 22 and 24 (dropped 18 and 20)
- Pinned `packageManager` to `npm@10.9.2`

## v1.2.0 (2026-07-13)

A+ hardening release: security, performance, polyglot coverage, lean dependencies.

### Added

- `tooling-caches` cleaner (`.vite`, `.nuxt`, `.terraform`, `DerivedData`, etc.)
- `java-gradle` cleaner (`.gradle`)
- `package-caches` global cleaner (npm `_cacache`, pnpm store layouts)
- `os-junk` cleaner replaces `ds-store` (adds `Thumbs.db`, `desktop.ini`; `ds-store` remains a config alias)
- Parallel directory walks (`mapWithConcurrency`) and parallel tree sizing (`measureTreeBytes`)
- Path boundary enforcement via `allowedRoots` on `executeClean`
- Input validation for git branch names and docker resource ids
- High-risk tier: git branch deletion and docker volumes require typing `DELETE` to confirm
- Config `gitFetch` to run `git fetch --prune` before branch scan
- Internal `ansi`, `spinner`, and `text-table` utilities (zero chalk/ora/cli-table3)
- Security, parallel, and validation test suites
- CI `npm audit --audit-level=high`; release gate runs coverage + audit

### Changed

- Runtime dependencies reduced from 7 to 4 (`commander`, `cosmiconfig`, `enquirer`, `micromatch`)
- `git-stale-branches` risk raised to `high`
- Docker dangling volumes report `high` risk; images/containers stay `medium`
- `minAgeDays` now applies to `python-venv` and `build-artifacts`
- Coverage thresholds raised to 90% statements/lines/functions, 85% branches

### Fixed

- Library `executeClean` counts and forwards `highRiskCount` to confirm callbacks
- `ds-store` config entries resolve to `os-junk` cleaner

## v1.1.0 (2026-07-13)

Hardening release addressing performance, scope safety, API decoupling, and coverage gaps.

### Added

- `build-artifacts` cleaner for `.next`, `dist`, `build`, `out`, `target`, `.turbo`, `.nx`
- `--scope` flag (`filesystem`, `git`, `global`, `all`) with **filesystem default**
- Config options: `scope`, `minAgeDays`, `protectedBranches`
- Injected `confirm` callback on `executeClean()` for scriptable library use
- `createInteractiveConfirm()` helper for CLI consumers
- Package `exports` map with explicit `types` condition
- Tests for scope filtering, age filter, build artifacts, and protected branches

### Changed

- **Breaking:** default scan scope is `filesystem` only; Docker and Git cleaners require `--scope all|git|global` or explicit config
- Filesystem scan sizes matched directories in the same walker (`measureSubtreeBytes`) instead of a separate `getSizeBytes` pass
- `node-modules` supports `minAgeDays` age filtering via config
- `git-stale-branches` accepts extra `protectedBranches` from config
- Interactive confirmation moved from `execution.ts` to `utils/confirm.ts` (library core is prompt-free)
- Explicit `--type` still runs the requested cleaner regardless of scope

### Fixed

- Windows git integration tests (longer timeout, `core.longpaths`, retrying temp cleanup on `EBUSY`)
- `repo-scanner` unit test no longer shells out to git for dedupe logic

## v1.0.1 (2026-07-13)

Architecture hardening and public release polish.

### Fixed

- `dj clean --json` now emits a single JSON document (scan + optional `clean` section)
- Windows-safe nested path pruning via case-normalized path comparison
- Submodule `.git` files are discovered as Git repositories
- Config with only unknown cleaner names fails at load time instead of running every cleaner (including global Docker)
- Invalid `ignore` globs are dropped at load and scan time so scans do not crash on bad patterns

### Changed

- README rewritten as a product pitch (problem, promise, audience) before the command reference
- `Cleaner` is now a discriminated union by `scope` with compile-time field requirements
- Scan results prune nested path findings before display and totals
- `executeClean()` is side-effect free; use `onDeleteError` for rendering failures
- Git branch listing uses `--format=%(refname:short)` for stable parsing
- Docker image/container findings include size bytes when inspect succeeds
- CLI orchestration extracted to `src/cli-service.ts` for testability
- Shared utilities: `utils/paths.ts`, `utils/cleaner-availability.ts`, `utils/scan-callbacks.ts`, `utils/ignore-patterns.ts`

### Added

- [API reference](./api.md) with JSON contract documentation
- [Publishing checklist](./publishing.md) for GitHub and npm release
- Public README with full command reference, safety model, and author credit ([@wordrae](https://x.com/wordrae))
- `.node-version` for Node 18
- Tests for paths, JSON contract, CLI service, and ignore pattern sanitization

## v1.0.0 (2026-07-12)

Production release.

### Added

- Six built-in cleaners: `node-modules`, `python-cache`, `python-venv`, `ds-store`, `git-stale-branches`, `docker-resources`
- Three cleaner scopes: filesystem, git-repo, global
- `dj list-cleaners` command (alias `dj list`)
- `--json`, `--quiet`, `--verbose` CLI flags
- Config validation warnings for unknown cleaners and invalid ignore globs
- JSON Schema for `.janitorrc` ([janitor.schema.json](./janitor.schema.json))
- Programmatic API exports via `dev-janitor` package
- Cross-platform CI (Linux, Windows, macOS; Node 18-22)
- Dedicated Git and Docker test jobs in CI
- Test coverage threshold (80%+)
- OSS files: CODE_OF_CONDUCT, SECURITY, issue/PR templates, dependabot, release workflow

### Changed

- `Finding` now includes `kind` (`path`, `git-branch`, `docker-resource`)
- `scan` orchestrates filesystem, repo, and global phases
- Version read from `package.json` at runtime
- Standard exit codes: 0 success, 1 error, 2 cancelled

## v0.1.0 (2026-07-12)

Initial Phase 1 release.

- `dj scan` and `dj clean` commands
- `node-modules` cleaner
- `.janitorrc` config via cosmiconfig
- Interactive confirmation, `--dry-run`, `--force`
- Vitest unit tests and GitHub Actions CI
