# sota_adif_updater
This is a small command line utility to quickly add SOTA and POTA references to an existing ADIF file.

## Releasing a new version

1. Ensure all changes are merged to `main` and CI is green.
2. On `main`, bump the version and create a git tag:
   ```bash
   npm version patch   # or minor / major
   ```
3. Push the commit and tag:
   ```bash
   git push origin main --tags
   ```
4. Go to **GitHub → Releases → New Release**, select the tag, add release notes, and click **Publish release**.

The release workflow will automatically build the project and publish the new version to npm.

## One-time npm Trusted Publisher setup

This project uses [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers) so no stored secrets are needed. To configure it on npmjs.com:

1. Go to the package page → **Settings** → **Trusted Publishers** → **Add a trusted publisher**.
2. Fill in:
   - **Repository owner**: `spowers42`
   - **Repository name**: `sota_adif_updater`
   - **Workflow filename**: `release.yml`
3. Save. GitHub Actions will now authenticate via OIDC automatically on each release.
