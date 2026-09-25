# AGENTS.md — OpenCode 2 Native Plugin Starter

This repository is a **native OpenCode 2 plugin starter**. Preserve that constraint.

## 1. Source-of-truth order

When implementing or changing plugin behavior, use this order:

1. Current official OpenCode 2 documentation and the installed `@opencode/plugin` type definitions.
2. Current OpenCode source when the public docs are unclear.
3. Community plugins that explicitly target OpenCode 2.
4. Existing code in this starter.
5. Memory, old snippets, blog posts, or assumptions.

If sources disagree, prefer the current official API and record the compatibility finding in `docs/V2-COMPATIBILITY.md`.

## 2. Always search before inventing

Before adding a helper, subsystem, UI primitive, registry, state layer, or build mechanism:

- Search the official OpenCode 2 API first.
- Search GitHub/npm for current OpenCode 2 community patterns.
- Reuse the native API if it already solves the problem.
- Do not introduce a wrapper just to rename a native concept.

Community code is evidence, not the contract. Verify every borrowed API against current OpenCode 2 docs/types.

## 3. Native OpenCode 2 only

Allowed primary imports:

```ts
import { Plugin } from "@opencode/plugin"
import { Plugin } from "@opencode/plugin/tui"
```

Do not add executable imports from:

```text
@opencode-ai/plugin
@opencode-ai/plugin/tui
@opencode-ai/plugin/v2/*
@opencode-ai/sdk/*
```

Do not use OpenCode 1 plugin shapes or compatibility shims merely because they still load.

Configuration uses the plural key:

```json
{ "plugins": [] }
```

Never replace it with the old singular `plugin` key.

## 4. Keep the two surfaces separate

- `src/index.ts`: server plugin behavior.
- `src/tui.tsx`: CLI/TUI behavior.

Do not combine `{ server, tui }` into one legacy default-export shape. A package may export both entrypoints, but each entrypoint is a native `Plugin.define(...)` module.

Server code owns domain logic, hooks, transforms, storage, tool/session/permission integration, etc.
TUI code owns presentation and direct terminal interaction: slots, panels, routes, dialogs, keymaps, tabs, UI storage, theme, and reactive TUI data.

If the UI needs server behavior, use supported OpenCode APIs rather than duplicating business logic in the UI.

## 5. Minimal-first structure

Do not pre-create directories such as `tools/`, `hooks/`, `panels/`, or `routes/` unless the plugin actually needs them.

Start in the two entrypoints. Extract a module only when one of these is true:

- logic is reused;
- the file has a clear independent responsibility;
- tests benefit from isolation;
- the native API requires a separate unit.

Do not create a plugin framework inside the starter.

## 6. TUI rules

Prefer native OpenCode 2 primitives:

- `context.ui.slot(...)`
- `context.ui.panel.*`
- `context.ui.router.*`
- `context.ui.dialog.*`
- `context.ui.toast.*`
- `context.keymap.*`
- `context.tabs.*`
- `context.storage.*`
- `context.data.*`
- `context.theme`

Use OpenTUI/Solid components only inside the host-provided render surfaces. Do not start a second renderer for an embedded OpenCode plugin.

Avoid bundling a second incompatible copy of Solid/OpenTUI into a published TUI plugin. Keep them as peer dependencies when packaging.

## 7. Server rules

Prefer OpenCode 2 native domain APIs instead of shelling out or reaching into private files. Examples include:

- `ctx.agent`, `ctx.provider`, `ctx.model`, `ctx.command`
- `ctx.integration`, `ctx.mcp`, `ctx.reference`
- `ctx.session`, `ctx.permission`, `ctx.skill`, `ctx.tool`
- `ctx.storage`, `ctx.event`, `ctx.generate`
- documented transforms and lifecycle hooks

Keep transform callbacks cheap, deterministic, and repeatable. Do external I/O before the synchronous transform and call the relevant `reload()` when external captured state changes.

## 8. Examples

`examples/` holds nine runnable plugins: eight for the CLI/TUI surface and one for the server. They are part of the boilerplate, not scratch files: they are typechecked, scanned by the compatibility guard, imported by the contract tests, and catalogued in `examples/README.md`.

Treat them as the reference for how a native TUI plugin is written:

- an example only reads the `context` it is handed — no module state, no wrappers, no helper framework;
- therefore changing an example is always a change to `context.*` reads inside `render` or `run`;
- a new example is one directory with a `tui.tsx` and a `package.json` exporting `./tui`, plus a catalog row in `examples/README.md` and a contract test.

Do not add an example that only restates a doc snippet. Extend an existing surface, or add one that proves a native API the catalog does not cover yet.

## 9. Verification gate

Before completion run:

```bash
bun run verify
```

At minimum the change must pass:

- native-v2 compatibility scan;
- TypeScript typecheck;
- tests.

If Bun or the OpenCode 2 dependencies are unavailable in the environment, say exactly which verification could not run. Do not claim success without evidence.

## 10. Documentation discipline

Update documentation only when behavior or compatibility changes. Keep examples small and executable.

When adding a new native API area, add a short recipe to the relevant file under `docs/` or the skill references rather than inflating `AGENTS.md`.

## 11. Definition of done

A plugin change is done when:

- it uses native OpenCode 2 contracts;
- no unnecessary abstraction was added;
- server/TUI responsibilities remain clear;
- compatibility guard passes;
- typecheck/tests pass;
- any new usage is discoverable by an agent from `AGENTS.md`, the authoring skill, or the focused docs.
