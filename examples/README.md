# Examples

Ten runnable plugins: nine for the CLI/TUI surface and one for the server. They exist to be read, copied and modified,
and each one is a single file that reads exclusively from the native `context` it is handed.

Every example is part of the verification gate: `tsconfig.json` typechecks them, `scripts/check-v2.mjs` scans them for
legacy patterns, and `tests/contracts.test.ts` imports each entrypoint and asserts the catalog invariants.

## Catalog

Load any of them by path in `cli.json` (TUI) or `opencode.json` (server). This table is the single source of truth:
if it disagrees with the code, the code is wrong.

| Example | Entry | Surface | What it proves |
|---|---|---|---|
| `session-info` | `./tui` | `session.panel` | side panel from reactive `context.data.*`, panel-scoped keys, `panel.width` |
| `status-bar` | `./tui` | `prompt.footer.status`, `home.footer.status` | items in a host-owned status row, `storage.memory` toggle, slot input `mode` / `showDetails` |
| `dialog` | `./tui` | dialogs | `select` → `alert` flow, `set` + `show` + `clear` custom modal, `confirm`, `toast` |
| `setting` | `./tui` | dialogs + status | a settings list whose section rows open sub-options, `storage.store` preferences |
| `dashboard` | `./tui` | `ui.router` + `ui.tabs` | a full screen plugin route, `keymap.mode.push`, opening a session in a tab |
| `notify` | `./tui` | events | `data.on` on typed session events, `attention.notify`, unsubscribing on cleanup |
| `markdown` | `./tui` | markdown | a custom fence built with OpenTUI on `context.renderer` — **does not fire on 2.0.16** |
| `slots` | `./tui` | slots | the placement matrix plus `sidebar.*`, `session.composer.top`, `prompt.footer.file` |
| `sidebar-todo` | `./tui` | `sidebar.content` | a task list in the left sidebar, read from the `todowrite` tool call |
| `transforms` | `.` | `ctx.tool` `ctx.agent` `ctx.command` | a real tool with a JSON Schema input, an idempotent agent transform, a command, a hook, and disposing every registration |

TUI examples export `./tui`; the server example exports `.`. A test asserts each manifest exports exactly the
entrypoints its example has.

## Load the whole set

```json
{
  "plugins": [
    "/path/to/opencode-v2-plugin-starter/examples/session-info",
    "/path/to/opencode-v2-plugin-starter/examples/status-bar",
    "/path/to/opencode-v2-plugin-starter/examples/dialog",
    "/path/to/opencode-v2-plugin-starter/examples/setting",
    "/path/to/opencode-v2-plugin-starter/examples/dashboard",
    "/path/to/opencode-v2-plugin-starter/examples/notify",
    "/path/to/opencode-v2-plugin-starter/examples/markdown",
    "/path/to/opencode-v2-plugin-starter/examples/slots",
    "/path/to/opencode-v2-plugin-starter/examples/sidebar-todo"
  ]
}
```

The server example goes in `opencode.json` instead:

```json
{
  "plugins": ["/path/to/opencode-v2-plugin-starter/examples/transforms"]
}
```

Paths are the loading mechanism on purpose. The examples are deliberately *not* subpath exports of the starter: a
template that a user renames and ships should not carry ten example entrypoints with `acme.*` ids that collide with the
plugin itself, and this catalog already scales without growing a package surface. Promote one to a real entrypoint when
a plugin actually needs it, by moving it out of `examples/` and giving it its own `package.json`.

## Context surface per example

What each file reads, so you can find the closest example instead of writing new plumbing:

| Example | Context surface |
|---|---|
| `session-info` | `ui.slot(session.panel)`, `ui.panel.open`, `keymap.layer`, `data.session` (+ message/pending/permission), `data.location` (vcs/agent/command/mcp/skill), `ui.format.path`, `theme`, `usePlugin` |
| `status-bar` | `ui.slot(prompt.footer.status \| home.footer.status)`, `keymap.layer`, `storage.memory`, `data.session`, `data.location.vcs`, `theme` |
| `dialog` | `ui.dialog.alert/confirm/select/set/show/clear`, `ui.toast.show`, `keymap.layer`, `storage.memory`, `data.session`, `theme`, `usePlugin` |
| `setting` | `ui.dialog.select/confirm/alert`, `ui.toast.show`, `ui.slot(prompt.footer.status)`, `keymap.layer`, `storage.store`, `theme` |
| `dashboard` | `ui.router.register/navigate/current`, `ui.tabs.*`, `ui.dialog.select`, `keymap.layer` + `keymap.mode.push`, `data.session`, `data.project`, `ui.format.path`, `theme` |
| `notify` | `data.on` / `data.listen`, `attention.notify`, `ui.toast.show`, `storage.memory`, `theme` |
| `markdown` | `markdown.registerCodeBlockRenderer`, `renderer`, `theme`, `@opentui/core` renderables |
| `slots` | `ui.slot` with `prepend`/`append`/`before`/`after`, `sidebar.content`, `sidebar.footer`, `session.composer.top`, `prompt.footer.file`, `theme` |
| `sidebar-todo` | `ui.slot(sidebar.content \| sidebar.footer)`, `data.session.message`, `data.session`, `keymap.layer`, `theme` |
| `transforms` | `tool.transform`, `agent.transform`, `command.transform`, `tool.hook`, `session.prompt`, `storage` |

Shared context, for orientation:

```text
setup(context)        app, options, location, client, renderer, theme, themeMode
context.data          session (+ message/pending/permission), location (vcs/agent/command/mcp/skill), project, shell
context.ui            slot, panel.open, panel.current, dialog.*, toast.show, router.*, tabs.*, format.path
context.keymap        layer() with commands, palette, slash, bind, bindings, mode.push
context.storage       store() durable/async, memory() per process/sync
context.usePlugin()   the same context, from inside a slot/dialog/panel component
```

## How to modify an example

The rule that keeps these useful: **an example only ever touches the `context` it is given.** No module-level mutable
state, no wrappers, no helper framework. So changing what an example does is always a change to `context.*` reads,
never to plumbing. A test enforces the first half of that.

Each file opens with a header naming the context surface it uses. To change an example:

1. Find the closest example in the table above, and confirm the API against `docs/API-MAP.md` and the installed types in
   `node_modules/@opencode/plugin/dist/tui/context.d.ts`. Types are the source of truth, not this file.
2. Read the new value from `context` inside the slot's `render` (reactive) or inside a command `run` (imperative).
3. Style it with `context.theme.*` tokens only. Hardcoded colors break the user's theme.
4. Run `bun run verify`.

```tsx
// adding a row to the panel means adding a read, nothing else
<Row label="agent" value={session()?.agent ?? "default"} />
```

## Things the examples deliberately do not do

- No `/settings` style collision: `/settings` belongs to the host, so the example uses `/setting`. Slash and panel names
  are shared selection values — pick a free, prefixed name. A test enforces this.
- No `context.ui.model`: it is in the docs but absent from the installed types, in 2.0.4 and 2.0.16 alike. Session model
  info comes from `context.data.session.get(id)?.model`.
- No text `input` inside a custom dialog: that would depend on the host focusing the first field, and the examples
  should work by documented API alone.
- No pinned assumptions about theme shape. `@opencode/plugin` is pinned to the host version on purpose; a pin behind the
  running host typechecks green and throws at render time. A test enforces the pin matches the starter.
- No silent assumptions about tool schemas either. `sidebar-todo` reads `part.state.input`, which is an untyped
  `JsonValue` record, so it narrows defensively and its field names are marked unverified until a real `todowrite` call
  confirms them. A tool schema change must degrade to "nothing to show", never to an exception inside a slot render.

## Two examples that document a gap instead of a capability

- **`markdown`**: the host implements and wires `markdown.registerCodeBlockRenderer`, and a fence in the conversation
  never reaches it. Probes recorded zero invocations for `acme-todo`, `json` and `math`, and ` ```mermaid ` renders as
  plain code too. The code is correct; the conversation view does not use the composed renderNode. Full evidence in
  `docs/V2-COMPATIBILITY.md`.
- **`sidebar-todo`**: it builds a left-sidebar task list from the same `todowrite` call the host's own list uses. The
  field names of that call's input are not in the plugin types, so treat them as unverified until you see a real call.
