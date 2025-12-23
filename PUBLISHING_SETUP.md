# npm Publishing Setup

## Status: Configured

OIDC trusted publishing is set up and working for both packages:

| Package | npm URL | Trusted Publisher |
|---------|---------|-------------------|
| `logpare` | https://www.npmjs.com/package/logpare | `logpare/logpare` → `publish.yml` |
| `@logpare/mcp` | https://www.npmjs.com/package/@logpare/mcp | `logpare/logpare` → `publish.yml` |

## Publishing a New Version

1. Bump version in `package.json`
2. Commit and tag:
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```
3. GitHub Actions will publish automatically via OIDC (no tokens needed)

## How It Works

The workflow (`.github/workflows/publish.yml`) uses OIDC trusted publishing:
- `id-token: write` permission requests an OIDC token from GitHub
- `npm publish --provenance` sends that token to npm
- npm verifies the token matches the trusted publisher config
- No secrets or tokens stored in GitHub

## Troubleshooting

**OIDC fails for a new unscoped package:**
Unscoped packages (like `logpare`) must exist on npm before OIDC works. Do a one-time manual publish:
```bash
npm login
pnpm build
npm publish --access public
```
Then add the trusted publisher at `https://www.npmjs.com/package/PACKAGE_NAME/access`.

**Passkey users:** npm CLI doesn't support passkeys for publish. Create a granular access token at https://www.npmjs.com/settings/~/tokens for manual publishes.
