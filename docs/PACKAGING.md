# Packaging and Loading

## Package exports

A plugin package can expose the server and TUI entrypoints separately:

```json
{
  "name": "opencode-acme-plugin",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./tui": "./src/tui.tsx"
  },
  "dependencies": {
    "@opencode/plugin": "2.0.4"
  },
  "peerDependencies": {
    "@opentui/core": ">=0.5.8",
    "@opentui/solid": ">=0.5.8",
    "solid-js": ">=1.9.0"
  }
}
```

The current OpenCode 2 docs show source entrypoints directly. If a registry or deployment policy requires prebuilt JavaScript, add a build step deliberately; do not add bundling just because other frameworks normally do.

## Project-local server plugin

OpenCode automatically loads plugins beneath:

```text
.opencode/plugins/
```

This is the fastest path for a private project plugin.

## Server package/configured directory

Add packages or paths to the plural `plugins` array in `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-acme-plugin",
    "./plugins/local"
  ]
}
```

OpenCode 2 also supports object entries when plugin options are needed.

## CLI/TUI plugin

The CLI/TUI plugin docs use the CLI plugin configuration and package `./tui` export. Keep the same package name; the host resolves the TUI surface from the package rather than merging server and TUI into one legacy object.

Example `cli.json`:

```json
{
  "plugins": ["opencode-acme-plugin"]
}
```

## Dependency policy

This starter pins `@opencode/plugin` to the version against which it was created. Upgrade it intentionally:

1. Read OpenCode 2 migration/release notes.
2. Update the package.
3. Typecheck.
4. Run tests.
5. Run `bun run check:v2`.
6. Smoke-test the plugin in the matching OpenCode 2 CLI.
7. Update `docs/V2-COMPATIBILITY.md` with the new verified baseline.

Keep OpenTUI/Solid as peer dependencies for published TUI plugins to avoid embedding a second renderer/runtime.
