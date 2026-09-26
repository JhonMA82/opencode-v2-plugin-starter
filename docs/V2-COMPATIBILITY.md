# OpenCode 2 Compatibility Contract

This file exists because the names `v1`, `v2`, and `2.x` have been used across different generations of OpenCode packages and experiments.

## Native OpenCode 2 contract used here

Server plugin:

```ts
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "acme.example",
  setup(ctx) {},
})
```

CLI/TUI plugin:

```tsx
import { Plugin } from "@opencode/plugin/tui"

export default Plugin.define({
  id: "acme.example.tui",
  setup(context) {},
})
```

Configuration uses **`plugins`**, plural.

## The naming trap

Do not infer that a package is the native OpenCode 2 API merely because its path contains `/v2`.

This starter deliberately rejects executable imports from:

```text
@opencode-ai/plugin
@opencode-ai/plugin/tui
@opencode-ai/plugin/v2/*
@opencode-ai/sdk/*
```

Those belong to older/transitional API generations and are not the contract this starter targets.

## Separate entrypoints

A package can publish both surfaces:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./tui": "./src/tui.tsx"
  }
}
```

The entrypoints themselves remain independent native `Plugin.define(...)` modules. Do not recreate old combined shapes such as:

```ts
// Do not use.
export default {
  id: "example",
  server: {},
  tui: {},
}
```

## Verification policy

Before accepting an API copied from the internet:

1. Check the current OpenCode 2 docs.
2. Check installed `@opencode/plugin` types if possible.
3. Check current OpenCode source if documentation is unclear.
4. Only then use a community example.

Run:

```bash
bun run check:v2
```

This catches known accidental regressions but does not replace typechecking against the installed current package.

## Current baseline of this starter

As of 2026-09-25 this starter is checked against:

- native package `@opencode/plugin` 2.0.16 (and `@opencode/theme` 2.0.16, its pinned optional peer);
- a running host `opencode v2.0.16`;
- OpenCode 2 plugin documentation under `/v2/docs/build/plugins/`;
- OpenCode 2 CLI plugin documentation under `/v2/docs/build/plugins/cli/`.

The package version is pinned in `package.json` so an upstream release cannot silently change the starter. Upgrade
intentionally, then run the verification gate and update this document.

**The pin must match the host you actually run.** A pin behind the running host typechecks green and then crashes at
render time, because the types describe a theme the host does not have. That is not hypothetical: the 2.0.4 pin made
`context.theme.contextual.elevated` typecheck, and a 2.0.16 host threw
`undefined is not an object (evaluating 'context.theme.contextual.elevated')` from the slot render. When the host and
the pin disagree, the host is the truth and the pin moves.

## Findings from the 2.0.16 baseline

Recorded on 2026-09-25 while building `examples/session-info`. Installed types and the running host win over the
published docs when they disagree.

### `context.ui.model` is documented but still absent

The CLI plugin docs describe `context.ui.model.current()` and `context.ui.model.variant.*`. The installed
`UI` interface in `@opencode/plugin` 2.0.16 exposes `dialog`, `toast`, `format`, `router`, `panel`, `tabs` and `slot`
only — the same list as 2.0.4. Do not call `context.ui.model`. Session model information is reachable through
`context.data.session.get(id)?.model`.

### Theme tokens were renamed between 2.0.4 and 2.0.16

`context.theme` is typed by the optional peer `@opencode/theme`, which is pinned to the exact plugin version. The
vocabulary changed wholesale:

| 2.0.4 | 2.0.16 |
|---|---|
| `text.default` | `text.base` |
| `text.subdued` | `text.muted` |
| `text.feedback.<kind>.default` / `.subdued` | `text.feedback.<kind>.base` / `.muted` |
| `text.status.<running\|question\|permission\|unread>` | removed; use `text.feedback.*` |
| `border.default` | `border.base` |
| `background.default` | `background.base` |
| `background.surface.offset` / `.overlay` | `background.raised.base` / `.high` / `.max` |
| `theme.contextual.elevated` / `.overlay` | `theme.surface("dialog")` — the only surface name |
| `text.action.<variant>.<state>` | `text.action.<variant>` is a `StatefulColor`: `.base` plus `.state({...})` |

`theme.surface(name)` exists to re-resolve a theme on a raised surface and only accepts `"dialog"`. A side panel is
not a dialog: keep the base tokens and use `background.raised.*` for cards inside the panel.

Confirmed against a running 2.0.16 host by dumping `context.theme` from a throwaway `setup` probe: `contextual` is
absent, `surface` is a function, `surface("dialog")` returns a token set, `themeMode` is `dark`, and every token the
examples use is present (`text.base`, `text.muted`, `border.base`, `background.base`, `background.raised.base`,
`background.raised.high`, `text.feedback.{info,warning,error}.base`). The resolved `text` group has exactly
`action`, `base`, `feedback`, `formfield`, `muted` — no `status`.

`@opencode/theme` is a pinned dev dependency here. Without it, `skipLibCheck` silently degrades `context.theme` to
`any`, so invalid token names pass typecheck and fail only at render time.

For host-dependent work, dump the real shape instead of trusting types. A probe plugin whose `setup` writes
`JSON.stringify(Object.keys(context.theme))` to a file costs one TUI restart and turns "probably fine" into evidence.

### A second copy of OpenTUI breaks custom rendering

A custom `markdown.registerCodeBlockRenderer` has to build real renderables, so it imports `BoxRenderable` and
`TextRenderable` from `@opentui/core`. If the plugin resolves a *different* copy of that package than the host renders
with, the host rejects what it returns: its `Renderable` methods check `instanceof` against its own `BaseRenderable`.

Observed outside the host: a probe whose `@opentui/core` resolved to a separate instance threw
`remove expects a renderable child object` and nothing painted. Inside a real 2.0.16 TUI the same check passes, so the
host unifies the copy. The hazard is vendoring your own, not depending on it: keep it a peer dependency.

### `markdown.registerCodeBlockRenderer` works, but only on the assistant path

The API is implemented, the host wires it, and OpenTUI dispatches code tokens to it. A fence **written by the user**
never reaches it, which is easy to misread as the whole feature being dead.

The host side, in order:

```js
// the plugin manager merges every active plugin's map into one code-block-only renderNode
let N = tK(() => Object.fromEntries(markdownMaps().flatMap(m => Object.entries(m))))
// that node is exposed on the plugin context, and it IS what the UI reads
{ plugins: { ..., markdown: N }, activate, deactivate }
// dispatch, by normalised language
(token, ctx) => { if (token.type !== "code") return; return map.get(rh(token.lang ?? ""))?.(token, ctx) }
```

Two different surfaces render the transcript, and only one of them receives that node:

```text
assistant text part / reply   -> markdown renderable with renderNode = <composed>   [works]
user message                  -> code renderable, filetype "markdown", no renderNode  [never fires]
```

OpenTUI is not the blocker: in `top-level` block mode `MarkdownRenderable` calls `renderCustomNode` for every
top-level token, code blocks included. Verified on a real renderer using the host's own composition function: an
`acme-todo` fence produced `dispatch:acme-todo` and then `HIT:acme-todo`, and the card it returned mounted.

Confirmed on a live 2.0.16 host: a fence in model output reaches the callback and the card renders, content included.

So a plugin can restyle fenced blocks in model output, and must not expect it for fences the user typed. Two traps
worth naming, because both produced a wrong conclusion here:

- Probe a fence you typed yourself and you will conclude the feature is dead.
- Trust a headless harness over the real host. A card that mounted with a border but no text looked like an OpenTUI
  limitation; it was a bug in the harness (a renderer built after first paint, and a second `CliRenderer`). The host
  painted it correctly. Render a harness and an assertion are cheap, so it is easy to believe them over reality.

### Keymap command return type and ownership

`KeymapCommand.run` returns `void | false | Promise<void>`. `context.ui.panel.open(name)` returns `boolean`, so a
command must call it inside a block instead of returning it.

A keymap layer is owned by the component that creates it. Commands that open a panel are registered from a rendered
`app` slot contribution rather than from `setup`; panel-scoped keys are registered from inside the panel component.
