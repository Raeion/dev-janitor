# Publishing checklist

Manifest for maintainers shipping Dev Janitor to GitHub and npm.

## Branch protection

`main` is protected by an active repository ruleset:

- Target: `refs/heads/main`
- No force-push / non-fast-forward updates
- No branch deletion
- Pull requests required before merge
- Required status check: **CI** (aggregate job in `.github/workflows/ci.yml`)
- Repository admins may bypass for emergencies

Do not disable the ruleset without replacing equivalent protections.

## Pre-push (local)

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (94+ tests)
- [ ] `npm run test:coverage` meets thresholds (80% statements, 75% branches)
- [ ] `dj --version` matches `package.json`
- [ ] [changelog.md](./changelog.md) updated for the release version
- [ ] [README.md](../README.md) version references are current

## First public GitHub push

```bash
git init
git add .
git commit -m "feat: Dev Janitor v1.0.1 production CLI release"
git branch -M main
git remote add origin https://github.com/Raeion/dev-janitor.git
git push -u origin main
```

## npm publish (first time)

1. Create an npm account and log in: `npm login`
2. Confirm package name is available: `npm view dev-janitor` (404 means available)
3. Add `NPM_TOKEN` to GitHub repository secrets (Settings → Secrets → Actions)
4. Tag and push:

```bash
git tag v1.0.1
git push origin v1.0.1
```

The [release workflow](../.github/workflows/release.yml) runs lint, build, test, `npm publish --provenance`, and creates a GitHub Release.

### Manual publish (alternative)

```bash
npm run build
npm test
npm publish --access public
```

## Post-release

- [ ] Verify [npm package page](https://www.npmjs.com/package/dev-janitor)
- [ ] Verify GitHub Release notes
- [ ] Verify CI badge on README is green
- [ ] Smoke test: `npx dev-janitor scan .`

## Related docs

- [INDEX.md](./INDEX.md)
- [changelog.md](./changelog.md)
- [SECURITY.md](../SECURITY.md)
