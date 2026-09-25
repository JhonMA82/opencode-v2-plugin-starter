# OpenCode 2 Native Plugin Starter

A deliberately small starter for **native OpenCode 2 plugins**, with separate server and CLI/TUI entrypoints, agent guidance, a reusable authoring skill, and a guard that rejects common OpenCode 1 / transitional API patterns.

> Version: **0.1.0**  
> Target: **OpenCode 2 native plugin API**  
> Server API: `@opencode/plugin`  
> TUI API: `@opencode/plugin/tui`

## Why this starter exists

OpenCode's plugin ecosystem contains several generations of APIs. Some older packages still contain paths with `v2` in their name, which makes it easy for an agent to write code that runs through compatibility layers instead of using the current OpenCode 2 contract.

This starter chooses one rule: **native OpenCode 2 only**.

It intentionally does not create a framework on top of OpenCode. Use the host API directly. Add folders and abstractions only when a real plugin needs them.

## What is included

- `src/index.ts` — native server plugin entrypoint.
- `src/tui.tsx` — optional native CLI/TUI plugin entrypoint with a small footer + panel example.
- `examples/` — ten runnable plugins: nine for the CLI/TUI surface (side panel, status rows, dialogs, settings list,
  full screen route, events and notifications, custom markdown fence, slot placements, left-sidebar task list) and one
  for the server (tool, agent and command transforms plus a hook). Catalogued in `examples/README.md`, which is the
  single source of truth for what each one proves. They are the reference for how a native plugin is written, and each
  one only reads the `context` it is handed.
- `AGENTS.md` — hard rules for coding agents.
- `.opencode/skills/opencode-v2-plugin-authoring/` — reusable skill for authoring/extending plugins.
- `docs/API-MAP.md` — map of current server and TUI capabilities.
- `docs/V2-COMPATIBILITY.md` — OpenCode 2 vs legacy/transitional API rules.
- `docs/AGENT-WORKFLOW.md` — minimal workflow for an agent.
- `docs/SERVER-PLUGIN.md` and `docs/TUI-PLUGIN.md` — focused recipes.
- `docs/PACKAGING.md` — local loading and package exports.
- `docs/COMMUNITY-REFERENCES.md` — community references that were checked, with caveats.
- `scripts/check-v2.mjs` — deterministic guard against known legacy patterns.
- `tests/contracts.test.ts` — entrypoint contract smoke tests and example catalog invariants.

## Quick start

```bash
bun install
bun run verify
```

Then rename:

1. Package name in `package.json`.
2. `PLUGIN_ID` in `src/constants.ts`.
3. Example package names in `examples/`.

For a local project plugin, OpenCode automatically loads plugins placed under:

```text
.opencode/plugins/<your-plugin>/
```

For packages or plugins elsewhere, add them to the plural `plugins` array in `opencode.json(c)`. For a CLI/TUI package, use the CLI plugin configuration described in `docs/PACKAGING.md`.

## Minimal server plugin

```ts
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "acme.example",
  async setup(ctx) {
    await ctx.storage.set("loaded", true)
  },
})
```

## Minimal TUI plugin

```tsx
import { Plugin } from "@opencode/plugin/tui"

export default Plugin.define({
  id: "acme.example.tui",
  setup(context) {
    context.ui.toast.show({
      message: "Plugin loaded",
      variant: "success",
    })
  },
})
```

## Examples

`examples/` holds ten runnable plugins. The full catalog, with the context surface each one reads, lives in
[`examples/README.md`](examples/README.md) - that file is the single source of truth, so it is where to look before
writing new TUI code.

| Example | Surface | Proves |
|---|---|---|
| `session-info` | `session.panel` | side panel from reactive `context.data.*`, panel-scoped keys |
| `status-bar` | `prompt.footer.status`, `home.footer.status` | items in a host-owned status row, `storage.memory` |
| `dialog` | dialogs | `select` to `alert` flow, plus a custom JSX modal with its own keys |
| `setting` | dialogs + status | a settings list whose sections open sub-options, `storage.store` |
| `dashboard` | `ui.router` + `ui.tabs` | a full screen route, `keymap.mode.push`, session tabs |
| `notify` | events | `data.on` on typed events, `attention.notify`, unsubscribing |
| `markdown` | markdown | a custom fence - **does not fire on 2.0.16**, see the finding |
| `slots` | slots | the placement matrix, `sidebar.*`, `session.composer.top` |
| `sidebar-todo` | `sidebar.content` | a left-sidebar task list read from the `todowrite` tool call |
| `transforms` | `ctx.tool` `ctx.agent` `ctx.command` | a real tool, an idempotent agent transform, a command, a hook |

Two shapes worth seeing in full, because most plugins need one of them:

```tsx
// a side panel: contribute to the shared slot, decide if the selected name is yours
context.ui.slot({
  append: "session.panel",
  render: (panel) => (
    <Show when={panel.name === "acme.session-info.panel"}>
      <SessionInfoPanel panel={panel} />
    </Show>
  ),
})
```

```tsx
// a settings flow: every dialog result is optional, because cancelling resolves to undefined
const section = await context.ui.dialog.select<Section>({ title: "Ajustes", options })
if (!section) return
const picked = await context.ui.dialog.select<Profile>({ title: "Perfil", current: settings.profile, options })
if (!picked) return
await setSettings((draft) => {
  draft.profile = picked
})
```

Load any of them by path, for example `{ "plugins": ["./examples/session-info"] }` in `cli.json`. The catalog shows the
whole set and how to load the server one.

## Philosophy

1. Search the official OpenCode 2 API and community examples before inventing.
2. Official current OpenCode 2 docs/types beat community examples.
3. Prefer deterministic code over LLM behavior where possible.
4. Use OpenCode's native registries, hooks, storage, keymaps, slots, panels, dialogs, routes, and data APIs directly.
5. Keep server logic and TUI presentation separate.
6. Do not add an abstraction until at least one real use case requires it.
7. Run `bun run verify` before considering a change complete.

## Hard compatibility rule

These imports are **not allowed** in executable starter code:

```text
@opencode-ai/plugin
@opencode-ai/plugin/tui
@opencode-ai/plugin/v2/*
@opencode-ai/sdk/*
```

The native OpenCode 2 package is `@opencode/plugin`.

See `docs/V2-COMPATIBILITY.md` before changing plugin entrypoints or configuration.

## Authoritative references

- OpenCode 2 plugin overview: https://opencode.ai/v2/docs/build/plugins/
- OpenCode 2 CLI/TUI plugins: https://opencode.ai/v2/docs/build/plugins/cli/
- OpenCode 2 migration from V1: https://opencode.ai/v2/docs/build/plugins/migrate-from-v1/

The repository intentionally keeps URLs in documentation rather than copying large API definitions that can become stale.
