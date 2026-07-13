# Configuration

Dev Janitor loads optional configuration via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig).

## Supported files

Search starts at the scan path and walks upward:

| File | Format |
|---|---|
| `.janitorrc` | JSON |
| `.janitorrc.json` | JSON |
| `.janitorrc.yaml` / `.janitorrc.yml` | YAML |
| `janitor.config.js` | JavaScript |
| `janitor.config.cjs` | CommonJS |
| `janitor.config.mjs` | ESM |

## Schema

JSON Schema: [janitor.schema.json](./janitor.schema.json)

## Options

### `ignore`

Array of micromatch globs (relative to the scan root). Matching paths are not scanned.

```json
{
  "ignore": ["**/vendor/**", "**/important-cache/**"]
}
```

Invalid glob patterns are dropped from the active ignore list and reported as warnings when `--verbose` is set.

### `cleaners`

Array of built-in cleaner names. When empty or omitted, all cleaners run.

```json
{
  "cleaners": ["node-modules", "python-cache", "ds-store"]
}
```

| Cleaner | Scope | Requires |
|---|---|---|
| `node-modules` | filesystem | - |
| `python-cache` | filesystem | - |
| `python-venv` | filesystem | - |
| `ds-store` | filesystem | - |
| `build-artifacts` | filesystem | - |
| `git-stale-branches` | git-repo | `git` on PATH |
| `docker-resources` | global | `docker` on PATH |

Unknown cleaner names produce a config warning and are skipped. If every name in `cleaners` is unknown, config load fails with an error instead of falling back to all cleaners.

### `scope`

Default scan scope when `--scope` is not passed on the CLI. Defaults to `filesystem`.

| Value | Behavior |
|---|---|
| `filesystem` | Directory walk only (safe default) |
| `git` | Filesystem walk + git-repo cleaners |
| `global` | Global cleaners only (e.g. Docker) |
| `all` | Filesystem + git + global |

### `minAgeDays`

Skip age-filterable cleaners (currently `node-modules`) when the directory was modified more recently than this many days. `0` disables filtering.

### `protectedBranches`

Extra branch names that `git-stale-branches` must never delete, in addition to `main`, `master`, `develop`, and the current branch.

## Example

```json
{
  "ignore": ["**/node_modules/.cache/**"],
  "cleaners": ["node-modules", "python-cache", "git-stale-branches"],
  "scope": "all",
  "minAgeDays": 30,
  "protectedBranches": ["trunk"]
}
```

## CLI overrides

`dj scan --type=node` or `dj clean --type=docker` overrides the config `cleaners` list for that run.

`dj scan --scope=all` overrides the config `scope` for that run.

## Related docs

- [Cleaners](./cleaners.md)
- [Architecture](./architecture.md)
- [README](../README.md)
