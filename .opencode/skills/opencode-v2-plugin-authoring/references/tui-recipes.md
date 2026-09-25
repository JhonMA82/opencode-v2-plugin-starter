# TUI Recipes

Import:

```tsx
import { Plugin } from "@opencode/plugin/tui"
```

Native entrypoint:

```tsx
export default Plugin.define({
  id: "acme.plugin.tui",
  setup(context) {
    // Register only the UI surfaces the plugin needs.
  },
})
```

Choose the smallest native surface:

```text
status/content beside host UI  -> context.ui.slot(...)
prompt/home status row items   -> context.ui.slot({ append: "prompt.footer.status" | "home.footer.status" })
short modal interaction        -> context.ui.dialog.alert/confirm/prompt/select
plugin-owned modal body        -> context.ui.dialog.set + show(() => <JSX/>) + clear()
short feedback                 -> context.ui.toast.show(...)
contextual workspace           -> context.ui.panel.* + session.panel slot
full plugin screen             -> context.ui.router.*
keyboard/palette/slash action  -> context.keymap.layer(...)
navigation                     -> context.tabs.* / router
host reactive state            -> context.data.*
preferences that must persist -> context.storage.store (durable, async mutation)
view state for this process    -> context.storage.memory (sync, gone on exit)
```

Do not use the old compatibility `api.command` API. Do not instantiate a second OpenTUI renderer inside OpenCode.

Worked examples, all in `examples/`:

- `setting/tui.tsx` — a settings list: one dialog of sections, each opening its own options dialog, persisted with
  `storage.store` and read back from a status slot.
- `dashboard/tui.tsx` — a full screen route: `ui.router.register` plus `navigate`/`current`, `keymap.mode.push` for a
  page-owned input mode, and `ui.tabs.focus` to jump to a session.
- `notify/tui.tsx` — `data.on` on typed session events, then `attention.notify`; return the unsubscribe functions.
- `markdown/tui.tsx` — a custom fenced block built with OpenTUI renderables on `context.renderer`; return
  `undefined` for content you do not own so the host keeps rendering it.
- `slots/tui.tsx` — the placement matrix on one path, plus `sidebar.*`, `session.composer.top`, `prompt.footer.file`.
- `dialog/tui.tsx` — `select` → `alert` over session data, plus a custom JSX modal whose keys live in a layer
  registered inside the dialog component.
- `status-bar/tui.tsx` — items in the two native status rows, with a detail toggle in TUI memory.
- `session-info/tui.tsx` — a side panel (`session.panel`) fed by reactive `context.data.*`, opened from an `app` slot
  keymap layer.

For the server surface, read `examples/transforms/index.ts`: a tool with a plain JSON Schema input, an idempotent
agent transform, a command, a hook, and disposing every registration. Transform callbacks must stay synchronous, cheap
and repeatable; do the I/O in the tool, the hook or the command.

Contract traps the examples exist to prevent:

- `run` must return `void | false | Promise<void>`; `ui.panel.open()` returns `boolean`.
- Every dialog result is optional, because cancelling resolves to `undefined`.
- Slash and panel names are shared selection values: the host already owns `/settings`, so take a free name.
- Theme tokens are `theme.text.base`, `theme.text.muted`, `theme.border.base`, `theme.background.raised.*`. There is
  no `text.default` and no `theme.contextual`.
- The `@opencode/plugin` pin must match the running host, or slot renders throw at runtime despite a clean typecheck.

For deeper examples read `docs/TUI-PLUGIN.md` and the current official OpenCode 2 CLI plugin docs.
