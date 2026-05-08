# VS Code Marketplace Publishing

Use this checklist when publishing `webflow-cms-binding-highlighter` to the VS Code Marketplace.

## One-Time Setup

1. Create or confirm the publisher account `austin-thesing` in the Visual Studio Marketplace publisher portal.
2. Create an Azure DevOps personal access token with Marketplace permissions.
3. Log in locally:

```bash
npx vsce login austin-thesing
```

Paste the PAT when prompted. `vsce` stores it for future publishes.

## Pre-Publish Checklist

1. Confirm `package.json` has the intended `publisher`, `name`, `displayName`, `repository`, `icon`, and `version`.
2. Update `README.md` with user-facing release notes and screenshots if behavior changed.
3. Run verification:

```bash
npm test
```

4. Build a local package:

```bash
npm run package
```

5. Install the generated `.vsix` in a clean VS Code/Cursor window and smoke-test:
   - Webflow CMS binding pills still render.
   - `Webflow CMS Bindings: Validate Schema` reports JSON-LD syntax/schema issues.
   - Schema property completions appear inside a JSON-LD object with `@type`.
   - The recommended-properties quick fix inserts missing rich-result fields.

## Publish

Publish the current version from `package.json`:

```bash
npx vsce publish
```

Or let `vsce` bump the version and publish in one command:

```bash
npx vsce publish patch
```

For this release, the version is `0.2.0`, so publish without an automatic bump unless you decide to change it again.

## After Publishing

1. Open the Marketplace listing and verify the rendered README, icon, version, and install button.
2. Install from the Marketplace in VS Code/Cursor and repeat the smoke test.
3. Tag the release in git once the Marketplace version is confirmed:

```bash
git tag v0.2.0
git push origin v0.2.0
```
