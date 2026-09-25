# TUI Plugin Recipes

Use `@opencode/plugin/tui`. The TUI entrypoint should render and interact with OpenCode; it should not become a second application framework.

## Small status: slot

```tsx
context.ui.slot({
  append: "prompt.footer.status",
  render: () => <text fg={context.theme.text.muted}>ready</text>,
})
```

Use slots when the UI belongs next to existing OpenCode content.

## Contextual workspace: panel

Register content for the `session.panel` slot and open it by name:

```tsx
const PANEL = "acme.example.panel"

context.ui.slot({
  append: "session.panel",
  render: (panel) => (
    <Show when={panel.name === PANEL}>
      <box padding={1}>
        <text>Example panel</text>
      </box>
    </Show>
  ),
})

context.ui.panel.open(PANEL)
```

Use a panel for contextual status, work units, review evidence, checklists, logs or focused plugin controls that should coexist with a session.

The slot input is `PanelInput` and is reactive: `name`, `sessionID`, `width`, `presentation`, `focused`, plus
`focus()`, `close()` and `toggleFullscreen()`. Panel keyboard layers are only reachable while the panel owns input.

### Worked example

`examples/session-info/tui.tsx` is a complete plugin that renders session and environment information in the side
panel. It shows the full pattern: warm location data in `setup`, contribute to `session.panel`, sync session-scoped
caches from a `createEffect`, read reactive host state with `context.data.*`, and bind panel keys with a keymap
layer. Load it from `cli.json`:

```json
{
  "plugins": ["./examples/session-info"]
}
```

Open it with `/info`, from the command palette, or with `f` (full screen) and `r` (refresh) while the panel has focus.

## Status bar: the `*.footer.status` slots

The host owns the status row. `prompt.footer.status` places contributions under the composer, `home.footer.status` in
the home footer; contributions land after the built-in health indicators and before the version. Use these instead of
replacing a row: `append` adds items to a row other plugins also contribute to.

`prompt.footer.status` publishes `{ sessionID?, mode, showDetails }` — enough to react to the session and to the
composer being in shell mode. `home.footer.status` publishes no input.

```tsx
context.ui.slot({
  append: "prompt.footer.status",
  render: (input) => (
    <box flexDirection="row" gap={2}>
      <Show when={input.mode === "shell"}>
        <text fg={context.theme.text.feedback.info.base}>shell</text>
      </Show>
      <text fg={context.theme.text.muted}>{clock()}</text>
    </box>
  ),
})
```

A status bar is the one surface that must not be noisy, so keep a detail toggle. TUI memory is the right store for a
view preference: it survives hot reloads and dies with the process.

```tsx
const [settings, setSettings] = context.storage.memory(PLUGIN_ID, { initial: { detailed: false } })
```

### Worked example

`examples/status-bar/tui.tsx` adds a git branch, a shell-mode badge, session model/cost/message counts and a clock to
both status rows, and toggles the detail level with `/statusbar` or the command palette. Its command has a stable
`id`, so a user can bind it in `cli.json` instead. Load it with
`{ "plugins": ["./examples/status-bar"] }`.

## Full-screen experience: route

Use `context.ui.router.register(...)` when the plugin genuinely needs its own screen. Prefer a panel or dialog for smaller workflows.

## Interaction: keymap layer

```tsx
context.keymap.layer(() => ({
  mode: "global",
  priority: 10,
  commands: [
    {
      id: "acme.example.open",
      title: "Example: Open panel",
      group: "Example",
      palette: true,
      slash: { name: "example" },
      run: () => {
        context.ui.panel.open("acme.example.panel")
      },
    },
  ],
}))
```

This is the native OpenCode 2 command/keymap surface. Do not use the legacy TUI `api.command` compatibility API.

Two contract details matter:

- `run` must return `void | false | Promise<void>`. `ui.panel.open()` returns `boolean`, so wrap it in a block
  (`run: () => { context.ui.panel.open(name) }`) instead of returning it directly.
- A layer is owned by the component that creates it. Commands that must live for the whole session — including the
  ones that open a panel — are registered from a rendered slot, not from `setup`:

```tsx
context.ui.slot({
  append: "app",
  render: () => {
    context.keymap.layer(() => ({ commands: [{ id: "acme.example.open", run: openPanel }] }))
    return null
  },
})
```

## Short interaction: dialogs + toast

Prefer the host's native dialog APIs for alert/confirm/prompt/select flows. Use `context.ui.toast.show(...)` for short feedback that does not warrant a dialog.

```text
alert({ title, message })                  -> Promise<void>
confirm({ title, message, label? })        -> Promise<boolean | undefined>
prompt({ title, description?, value? })    -> Promise<string | undefined>
select<T>({ title, options, current? })    -> Promise<T | undefined>
```

Every result is optional: cancelling resolves to `undefined`, so a flow must bail out instead of assuming a value.

A dialog is modal, so a plugin opens one from a command, not from `setup`. To own the dialog body, size it, mount
plugin JSX in the host's modal chrome, and close it:

```tsx
context.ui.dialog.set({ size: "medium", centered: true })
context.ui.dialog.show(() => <MyDialog />)
context.ui.dialog.clear()
```

Like a panel, a custom dialog owns its input while it is open, so its keys come from a layer registered in the
component that renders it.

### Worked example

`examples/dialog/tui.tsx` has both shapes. `/report` chains `select` → `alert` over real session data and remembers
the last pick. `/notes` mounts a custom JSX dialog with its own keymap (`ctrl+n` add, `ctrl+d` clear behind a
`confirm`, `escape` close) backed by TUI memory, with a toast for feedback. Load it with
`{ "plugins": ["./examples/dialog"] }`.

### Settings dialog: a list that opens options

A settings list is two native dialogs deep: level one lists sections, level two lists that section's options. Two
details make it read as settings instead of a menu — every row describes the value in effect, and level two
preselects it with `current`.

```tsx
const section = await context.ui.dialog.select<Section>({
  title: "Ajustes",
  options: SECTIONS.map((item) => ({ title: item.title, value: item.value, description: describe(settings, item.value) })),
})
if (!section) return

const picked = await context.ui.dialog.select<Profile>({ title: "Perfil", current: settings.profile, options })
if (!picked) return
await setSettings((draft) => {
  draft.profile = picked
})
context.ui.toast.show({ message: `Perfil: ${picked}`, variant: "success" })
```

Preferences belong in durable storage, not TUI memory, and its mutation is async:

```tsx
const [settings, setSettings] = context.storage.store<Settings>(SETTINGS_KEY, { initial: INITIAL })
```

Guard destructive rows with `confirm`, keep the values in one typed object, and read them from a slot so the user sees
the effect. `examples/setting/tui.tsx` does all of it: `/setting` opens the section list, each section opens its
options, and the stored profile/clock/notification values drive a status item. Load it with
`{ "plugins": ["./examples/setting"] }`.

Slash names are shared selection values, exactly like panel names. `/settings` belongs to the host, so a plugin that
wants a settings surface has to pick a free name: prefix it, or use the singular as this example does.

## State

- `context.storage.store`: persistent TUI plugin state. Use it for preferences that must survive a restart.
- `context.storage.memory`: in-memory TUI state. Use it for view state that dies with the process.
- `context.data.*`: host/session/project reactive data.

Do not mirror host state unless the plugin truly owns a derived value.

## Theme tokens

`context.theme` is the resolved theme of the running session, typed by `@opencode/theme` (pinned to the same version
as `@opencode/plugin`). Never hardcode a color: reading tokens is what makes a plugin follow the user's theme,
light/dark mode and `@context:` overrides for free.

In 2.0.16 the tokens are:

```tsx
context.theme.text.base // primary text
context.theme.text.muted // labels, hints
context.theme.text.feedback.<error|warning|success|info>.base
context.theme.text.action.<primary|secondary|destructive> // StatefulColor: .base, .state({...})
context.theme.border.base
context.theme.background.base
context.theme.background.raised.base // cards inside a panel; also .high and .max
context.theme.surface("dialog") // re-resolved on a raised surface; "dialog" is the only name
```

There is no `text.default`, no `text.subdued`, no `text.status.*` and no `theme.contextual`. A side panel is not a
dialog: keep the base tokens and lift cards with `background.raised.*` instead of re-resolving the surface.

Install `@opencode/theme` as a dev dependency (this repo does) so a mistyped token fails `tsc` instead of throwing
inside a slot render at runtime.

### Emphasis and layout

OpenTUI's JSX has no `bold` prop. Emphasis comes from the attribute bitmask, and `@opentui/core` stays a peer
dependency so nothing extra is bundled:

```tsx
import { TextAttributes } from "@opentui/core"

<text attributes={TextAttributes.BOLD} fg={context.theme.text.base}>
  {title}
</text>
```

## Solid/OpenTUI

OpenCode's TUI is built on OpenTUI/Solid. A plugin should render into host-provided surfaces. Keep Solid/OpenTUI as peer dependencies for published packages so the plugin does not accidentally bundle a second incompatible runtime.

Current OpenTUI Solid TypeScript setup uses:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@opentui/solid"
  }
}
```

## Choose the smallest surface

```text
one-line state        -> slot
short question        -> dialog
temporary feedback    -> toast
contextual workspace  -> panel
full plugin screen    -> route
keyboard action       -> keymap layer
host navigation       -> tabs/router
```

This keeps the plugin native and prevents unnecessary custom TUI infrastructure.
