# Contributing to Dev Janitor

Thanks for helping keep developer machines tidy.

Maintainer: **wordrae**: [@wordrae on X](https://x.com/wordrae)

## Development setup

```bash
git clone https://github.com/iamir/dev-janitor.git
cd dev-janitor
npm install
npm test
npm run lint
npm run build
```

Run the CLI locally:

```bash
npm run dev -- scan .
# or after build
node dist/cli.js scan .
```

## Cleaner scopes

Dev Janitor supports three cleaner scopes:

| Scope | When it runs | Example |
|---|---|---|
| `filesystem` | During directory walk | `node_modules`, `.DS_Store` |
| `git-repo` | Once per discovered `.git` parent | merged local branches |
| `global` | Once per scan | Docker dangling resources |

## How to add a cleaner

Cleaners are the contribution surface. One file, one responsibility.

### 1. Create the module

Add `src/cleaners/your-cleaner.ts`:

**Filesystem directory example:**

```ts
import path from 'node:path';
import type { Cleaner } from '../types.js';

export const yourCleaner: Cleaner = {
  name: 'your-cleaner',
  description: 'Short explanation of what this removes',
  risk: 'low',
  scope: 'filesystem',
  target: 'directory',
  skipChildren: true,
  detect(dirPath: string): boolean {
    return path.basename(dirPath) === 'your-target';
  },
};
```

**Git-repo example:** implement `scanRepo(repoRoot)` and set `requiresCli: ['git']`.

**Global example:** implement `scanGlobal()` and set `requiresCli: ['docker']` if needed.

### 2. Register it

In `src/cleaners/index.ts`:

1. Import the cleaner
2. Append it to `allCleaners`
3. Optionally add a short `--type` alias in `typeAliases`
4. Update `docs/janitor.schema.json` enum if config should allow the name

### 3. Add tests

Add `tests/cleaners/your-cleaner.test.ts` or extend existing tests with temp fixtures that prove:

- detection or scan works
- ignore globs still work (filesystem)
- `skipChildren` behavior (if used)
- delete path works in `executeClean` (if new `Finding.kind`)

### 4. Document it

Update:

- `docs/cleaners.md`
- `docs/changelog.md`
- the cleaners table in `README.md`

### Cleaner contract

See `src/types.ts` for the full interface. Rules of thumb:

- Prefer regenerable targets (`node_modules`, `__pycache__`, caches)
- Mark anything that needs network or history checks as `medium` or `high`
- Never delete outside the path the user passed to `dj` (filesystem scope)
- Keep `detect` fast; size calculation is handled by the scanner
- Use `requiresCli` for external tools; they are skipped when unavailable

## Good first issues

- Additional filesystem caches (`.next`, `dist`, `target`, `.turbo`)
- Safer Git workflows (optional remote-tracking cleanup behind a flag)
- Shell completions (bash/zsh/fish)

## Pull request checklist

- [ ] `npm test` passes
- [ ] `npm run test:coverage` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Docs updated (`docs/` + README if user-facing)
- [ ] No secrets or machine-specific paths committed

## Cleaner test layout

Add focused tests under `tests/`:

- `tests/<feature>.test.ts` for scanners and utilities
- `tests/cleaners/<cleaner-name>.test.ts` when a cleaner needs deep coverage

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
