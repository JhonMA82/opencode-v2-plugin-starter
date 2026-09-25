# Examples

Ten runnable plugins, nine for the CLI/TUI surface and one for the server. They exist to be read, copied and modified — each one is a single file that reads
exclusively from the native `context` it is handed.

Every example is part of the verification gate: `tsconfig.json` typechecks them, `scripts/check-v2.mjs` scans them for
legacy patterns, and `tests/contracts.test.ts` imports each entrypoint and asserts the catalog invariants.

## Catalog

### TUI surfaces

| Example | Surface | Demonstrates |
|---|---|---|
| `session-info/tui.tsx` | `session.panel` | side panel fed by reactive `context.data.*`, panel-scoped keys, `panel.width` |
| `status-bar/tui.tsx` | `prompt.footer.status`, `home.footer.status` | items in a host-owned status row, `storage.memory` toggle, slot input `mode` / `showDetails` |
| `dialog/tui.tsx` | dialogs | `select` → `alert` flow, `set` + `show` + `clear` custom modal, `confirm`, `toast` |
| `setting/tui.tsx` | dialogs + status | a settings list whose section rows open sub-options, `storage.store` preferences |
| `dashboard/tui.tsx` | `ui.router` + `ui.tabs` | a full screen plugin route, `keymap.mode.push`, opening a session in a tab |
| `notify/tui.tsx` | events | `data.on` on typed session events, `attention.notify`, unsubscribing on cleanup |
| `markdown/tui.tsx` | markdown | a custom fence built with OpenTUI on `context.renderer` — **does not fire on 2.0.16**, see the finding |
| `slots/tui.tsx` | slots | the placement matrix plus `sidebar.*`, `session.composer.top` and `prompt.footer.file` |
| `sidebar-todo/tui.tsx` | `sidebar.content` | a task list in the left sidebar, read from the `todowrite` tool call in the session messages, with a defensive narrowing because that input is an untyped record |

### Server surfaces

| Example | Surface | Demonstrates |
|---|---|---|
| `transforms/index.ts` | `ctx.tool` `ctx.agent` `ctx.command` | a real tool with a JSON Schema input, an idempotent agent transform, a command, a hook, and disposing every registration |

Server examples export `.` only, TUI examples export `./tui`, and `tests/contracts.test.ts` asserts each manifest
exports exactly the entrypoints its example has.

## How to load

By path in `cli.json`, relative to the config file's own directory:

```json
{
  "plugins": ["./examples/session-info"]
}
```

Or the whole set, with absolute paths:

```json
{
  "plugins": [
    "/path/to/opencode-v2-plugin-starter/examples/session-info",
    "/path/to/opencode-v2-plugin-starter/examples/status-bar",
    "/path/to/opencode-v2-plugin-starter/examples/dialog",
    "/path/to/opencode-v2-plugin-starter/examples/setting"
  ]
}
```

Paths are the loading mechanism on purpose. The examples are deliberately *not* subpath exports of the starter: a
template that a user renames and ships should not carry nine example entrypoints with `acme.*` ids that collide with the
plugin itself, and this catalog already scales without growing a package surface. Promote one to a real entrypoint when
a plugin actually needs it, by moving it out of `examples/` and giving it its own `package.json`.

## How to modify an example

The rule that keeps these useful: **an example only ever touches the `context` it is given.** No module-level mutable
state, no wrappers, no helper framework. So changing what an example does is always a change to `context.*` reads,
never to plumbing.

Each file opens with a header naming the context surface it uses. To change an example:

1. Decide which surface you need from the table below, then confirm it against `docs/API-MAP.md` and the installed
   types in `node_modules/@opencode/plugin/dist/tui/context.d.ts`. Types are the source of truth, not this file.
2. Read the new value from `context` inside the slot's `render` (reactive) or inside a command `run` (imperative).
3. Style it with `context.theme.*` tokens only. Hardcoded colors break the user's theme.
4. Run `bun run verify`.

```tsx
// adding a row to the panel means adding a read, nothing else
<Row label="agent" value={session()?.agent ?? "default"} />
```

## Context surface per example

```text
setup(context)        app, options, location, client, renderer, theme, themeMode
context.data          session (+ message/pending/permission), location (vcs/agent/command/mcp/skill), project, shell
context.ui            slot, panel.open, panel.current, dialog.*, toast.show, router.*, tabs.*, format.path
context.keymap        layer() with commands, palette, slash, bind, bindings
context.storage       store() durable/async, memory() per process/sync
context.usePlugin()   the same context, from inside a slot/dialog/panel component
```

## Things the examples deliberately do not do

- No `/settings` style collision: `/settings` belongs to the host, so the example uses `/setting`. Slash names and
  panel names are shared selection values — pick a free, prefixed name. A test enforces this.
- No `context.ui.model`: it is in the docs but absent from the installed types. Session model info comes from
  `context.data.session.get(id)?.model`.
- No text `input` inside a custom dialog: that would depend on the host focusing the first field, and the examples
  should work by documented API alone.
- No pinned assumptions about theme shape. `@opencode/plugin` is pinned to the host version on purpose; a pin behind
  the running host typechecks green and throws at render time. A test enforces the pin matches the starter.
