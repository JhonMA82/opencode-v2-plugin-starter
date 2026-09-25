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
- `examples/` — ten runnable plugins: nine for the CLI/TUI surface (side panel, status rows, dialogs, settings
  list, full screen route, events and notifications, custom markdown fence, slot placements, a left-sidebar task list) and
  one for the server (tool, agent and command transforms plus a hook). Catalogued in `examples/README.md`. They are the reference for how a
  native plugin is written, and each one only reads the `context` it is handed.
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

## Side panel example

`examples/session-info` is a complete CLI plugin that puts information in the session side panel: session status,
model, messages, cost and tokens, plus environment facts (OpenCode version, git branch, MCP/skill/agent counts).

```tsx
context.ui.slot({
  append: "session.panel",
  render: (panel) => (
    <Show when={panel.name === "acme.session-info.panel"}>
      <SessionInfoPanel panel={panel} />
    </Show>
  ),
})
```

Load it from `cli.json` with `{ "plugins": ["./examples/session-info"] }` and open it with `/info`.

## Status bar example

`examples/status-bar` contributes to the two native status rows instead of building a row of its own:

```tsx
context.ui.slot({
  append: "prompt.footer.status",
  render: (input) => <PromptStatus input={input} detailed={settings.detailed} />,
})
```

It shows the git branch, a `shell` mode badge, session model/cost/messages and a clock, and `/statusbar` toggles how
much of it is shown. Load it with `{ "plugins": ["./examples/status-bar"] }`.

## Dialog example

`examples/dialog` uses the promise-based dialogs and a plugin-owned modal:

```tsx
const picked = await context.ui.dialog.select<string>({ title: "Session report", options })
if (!picked) return // cancelling resolves to undefined
```

`/report` chains `select` → `alert` over session data; `/notes` mounts custom JSX with `set`/`show`/`clear` and its
own keys. Load it with `{ "plugins": ["./examples/dialog"] }`.

## Settings dialog example

`examples/setting` is a settings list built from two native dialogs: the first lists sections and shows the value in
effect, the second lists that section's options preselected with `current`.

```tsx
const section = await context.ui.dialog.select<Section>({ title: "Ajustes", options })
if (!section) return
const picked = await context.ui.dialog.select<Profile>({ title: "Perfil", current: settings.profile, options })
if (!picked) return
await setSettings((draft) => {
  draft.profile = picked
})
```

Preferences use `storage.store` (durable, async mutation) instead of TUI memory, and the stored values drive a status
item so the change is visible. Load it with `{ "plugins": ["./examples/setting"] }`.

Its slash command is `/setting`, singular: `/settings` belongs to the host, so an example must not take that name.

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
