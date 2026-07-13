# Dev Janitor

[![CI](https://github.com/Raeion/dev-janitor/actions/workflows/ci.yml/badge.svg)](https://github.com/Raeion/dev-janitor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/dev-janitor.svg)](https://www.npmjs.com/package/dev-janitor)
[![Node](https://img.shields.io/node/v/dev-janitor)](https://nodejs.org)

**Dev Janitor** is a local disk janitor for developers. One CLI (`dj`) that finds the junk you leave behind across projects, tells you how much space you get back, and only deletes when you say yes.

> Dev Janitor is `du` + a careful `rm` for developer debris: discover reclaimable junk, prove the savings, then clean only with consent.

## The problem

If you work across many repos, your machine quietly fills with:

- stale `node_modules`
- Python caches and venvs
- `.DS_Store` noise
- merged Git branches you forgot about
- dangling Docker images, containers, and volumes

You know it is there. You do not want to `rm -rf` by hand and hope you did not nuke the wrong thing.

## The pitch

**Scan first. Clean second. Never surprise you.**

```bash
dj scan .              # report only
dj clean . --dry-run   # preview deletes
dj clean .             # delete after y/N
```

That safety model is the product. `scan` never deletes. `clean` confirms by default. `--force` exists for CI, but it is opt-in.

## Who it is for

Developers with a `~/projects` graveyard of old clones. Polyglot shops (Node + Python). Anyone who wants reclaimable disk space without a custom shell script per machine.

Also built to be **scriptable**: `--json`, a stable output envelope, and a programmatic API (`scan`, `loadConfig`, `executeClean`) so you can wire it into CI or your own tooling.

## What it cleans

| Cleaner | Scope | What it removes | Risk |
|---|---|---|---|
| `node-modules` | filesystem | `node_modules/` directories | low |
| `python-cache` | filesystem | `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache` | low |
| `python-venv` | filesystem | `.venv/`, `venv/` | low |
| `ds-store` | filesystem | `.DS_Store` files | low |
| `build-artifacts` | filesystem | `.next`, `dist`, `build`, `out`, `target`, `.turbo`, `.nx` | low |
| `tooling-caches` | filesystem | `.vite`, `.nuxt`, `.terraform`, `DerivedData`, etc. | low |
| `java-gradle` | filesystem | `.gradle` build caches | low |
| `os-junk` | filesystem | `.DS_Store`, `Thumbs.db`, `desktop.ini` | low |
| `git-stale-branches` | git-repo | Merged local branches | **high** |
| `docker-resources` | global | Dangling images/containers (medium), volumes (high) | medium/high |
| `package-caches` | global | npm `_cacache` and pnpm store under `$HOME` | medium |

Three scopes matter: walk the tree, scan each Git repo, then hit global tools like Docker once. **By default only filesystem scope runs** so `dj scan .` stays path-scoped. Use `--scope all` for the full suite.

Type aliases: `--type=node`, `--type=python`, `--type=venv`, `--type=ds`, `--type=build`, `--type=git`, `--type=docker`.

High-risk deletions (git branches, docker volumes) require typing `DELETE` at the prompt.

Restore notes and cleaner details: [docs/cleaners.md](./docs/cleaners.md)

## Install

```bash
npm install -g dev-janitor
```

**Requirements:** Node.js 22.12 or newer. Optional: `git` and `docker` on PATH for Git and Docker cleaners.

### From source

```bash
git clone https://github.com/Raeion/dev-janitor.git
cd dev-janitor
npm install
npm run build
npm link
```

Verify:

```bash
dj --version
dj list-cleaners
```

## Quick start

```bash
# Scan the current directory (never deletes)
dj scan .

# See what would be removed
dj clean . --dry-run

# Remove junk after interactive confirmation
dj clean .

# Target one cleaner type
dj scan . --type=node
dj clean . --type=python --force

# Include git branches or Docker (not run by default)
dj scan . --scope all
dj scan . --scope git
dj clean . --scope global --type=docker --dry-run
```

Example scan output:

```text
  Dev Janitor  (dj)

Path:     /home/you/projects
Cleaners: node-modules, python-cache, ...

┌────────────────────────┬──────────┬──────────────┬──────┐
│ Path                   │ Size     │ Cleaner      │ Risk │
├────────────────────────┼──────────┼──────────────┼──────┤
│ .../app/node_modules   │ 142 MB   │ node-modules │ low  │
└────────────────────────┴──────────┴──────────────┴──────┘

Total reclaimable: 142 MB across 1 item(s)
Scanned 48 directories, 3 git repos.

Dry-run only. Run dj clean /home/you/projects to remove after confirmation.
```

## Commands

| Command | Description |
|---|---|
| `dj scan [path]` | Find junk under `path` (default: `.`). Never deletes. |
| `dj clean [path]` | Scan, then delete after confirmation. |
| `dj list-cleaners` | List all built-in cleaners (`dj list` alias). |

### Flags

| Flag | Commands | Description |
|---|---|---|
| `-t, --type <name>` | scan, clean | Run one cleaner (e.g. `node`, `docker`, `git`) |
| `-s, --scope <name>` | scan, clean | `filesystem` (default), `git`, `global`, or `all` |
| `--json` | all | Machine-readable JSON output |
| `--quiet` | all | Suppress non-error output |
| `--verbose` | scan, clean | Show config warnings and skipped cleaners |
| `--dry-run` | clean | Report what would be deleted without deleting |
| `--force` | clean | Delete without interactive confirmation |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Error or one or more delete failures |
| `2` | User cancelled confirmation |

## Safety model

| Command | Deletes? |
|---|---|
| `dj scan` | Never |
| `dj clean` | Only after `y/N` confirmation |
| `dj clean --dry-run` | Never |
| `dj clean --force` | Yes, no prompt (use in CI with care) |

Filesystem cleaners only touch paths under the directory you pass to `dj`. Git and Docker cleaners are **opt-in** via `--scope git`, `--scope global`, or `--scope all`. Docker cleaners target dangling resources on your local daemon.

Use `--verbose` to see why a cleaner was skipped (for example when `docker` is not installed).

## Configuration

Optional `.janitorrc` (or `janitor.config.js`) in your project or a parent directory:

```json
{
  "ignore": ["**/vendor/**", "**/important-cache/**"],
  "cleaners": ["node-modules", "python-cache"],
  "scope": "filesystem",
  "minAgeDays": 30,
  "protectedBranches": ["trunk", "release"]
}
```

| Key | Description |
|---|---|
| `ignore` | Micromatch globs (relative to scan root). Invalid patterns are dropped with a warning. |
| `cleaners` | Limit which cleaners run. Omitted or empty means all cleaners. If every name is invalid, config load fails. |
| `scope` | Default scan scope when `--scope` is omitted (`filesystem`, `git`, `global`, `all`). Defaults to `filesystem`. |
| `minAgeDays` | Skip age-filterable cleaners (e.g. `node-modules`) modified more recently than this many days. `0` disables. |
| `protectedBranches` | Extra branch names the git cleaner must never delete. |

CLI `--type` overrides `cleaners` for that run.

Full reference: [docs/configuration.md](./docs/configuration.md) · JSON Schema: [docs/janitor.schema.json](./docs/janitor.schema.json)

## JSON output

```bash
dj scan . --json
dj clean . --dry-run --json
dj list-cleaners --json
```

`scan` and `clean` emit a single JSON document per invocation. See [docs/api.md](./docs/api.md) for the full contract.

## Programmatic API

```ts
import { loadConfig, resolveCleaners, scan, executeClean, createInteractiveConfirm } from 'dev-janitor';

const config = await loadConfig(process.cwd());
const cleaners = resolveCleaners({ configCleaners: config.cleaners });

const result = await scan({
  rootPath: process.cwd(),
  cleaners,
  ignore: config.ignore,
  scope: config.scope,
  minAgeDays: config.minAgeDays,
});

if (result.findings.length > 0) {
  const clean = await executeClean({
    findings: result.findings,
    force: false,
    dryRun: true,
    confirm: createInteractiveConfirm(),
  });
  console.log(clean.wouldDelete);
}
```

## How it is built

TypeScript ESM CLI on Node 22.12+. Cosmiconfig for `.janitorrc`. Plug-in cleaners via a discriminated union by scope. Cross-platform (Linux / Windows / macOS). MIT licensed, on npm as `dev-janitor`.

Architecture in short: CLI → config → cleaner registry → scan orchestrator (filesystem + repo + global) → confirm → delete by finding kind.

Deep dive: [docs/architecture.md](./docs/architecture.md)

## Development

```bash
npm install
npm run dev -- scan .      # run CLI without building
npm test                   # unit + integration tests
npm run test:coverage      # 80%+ statement threshold
npm run lint
npm run build
```

## Contributing

Contributions welcome. Cleaners are the main extension point.

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Fork and branch from `main`
3. Add tests and docs for any user-facing change
4. Open a pull request

## Documentation

| Doc | Description |
|---|---|
| [docs/INDEX.md](./docs/INDEX.md) | Documentation manifest |
| [docs/architecture.md](./docs/architecture.md) | Modules and data flow |
| [docs/api.md](./docs/api.md) | JSON contract and library API |
| [docs/cleaners.md](./docs/cleaners.md) | Cleaner reference |
| [docs/configuration.md](./docs/configuration.md) | Config file guide |
| [docs/changelog.md](./docs/changelog.md) | Release history |
| [docs/publishing.md](./docs/publishing.md) | Maintainer release checklist |

## Author

Created and maintained by **wordrae**: [@wordrae on X](https://x.com/wordrae)

## License

[MIT](./LICENSE). Copyright (c) 2026 wordrae ([@wordrae](https://x.com/wordrae))
