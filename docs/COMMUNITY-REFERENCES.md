# Community References

Community projects are used here to discover patterns, not to define the API. Every borrowed pattern must still pass the current official OpenCode 2 docs/types.

## Most search results are OpenCode 1, not OpenCode 2

Searching for "opencode tui plugin" returns mostly the previous generation, often with a v2-looking URL. These shapes
belong to OpenCode 1 and must not be copied here:

```text
@opencode-ai/plugin, @opencode-ai/plugin/tui, @opencode-ai/sdk
api.command, api.route.register, api.slots.register, api.kv, api.keybind
tui.json with a "plugin" key          the native key is the plural "plugins"
package.json "oc-plugin" manifest    there is no such field
TuiPluginModule / export default { id, tui }   the two entrypoints stay separate Plugin.define modules
```

The native equivalents are in `docs/API-MAP.md`: `context.ui.slot`, `context.ui.router`, `context.ui.panel`,
`context.ui.dialog`, `context.ui.tabs`, `context.keymap.layer`, `context.storage`, `context.data`.

Rule of thumb: if a reference names `api.`, `tui.json`, or `@opencode-ai/`, it is evidence about an older generation.
Use it for ideas, never for contracts.

## `ChiR24/opencode-tps-meter`

Repository: https://github.com/ChiR24/opencode-tps-meter

Why it is useful:

- Explicitly handles the OpenCode 1 -> OpenCode 2 transition.
- Demonstrates that the OpenCode 2 config key is `plugins` (plural).
- Shows real-world TUI concerns such as slots/events and avoiding a second Solid runtime.

Caveat: it is intentionally dual-generation. Do not copy its compatibility code into this v2-only starter.

## `beamivalice/opencode2-mlx-serve`

Repository: https://github.com/beamivalice/opencode2-mlx-serve

Why it is useful:

- Real OpenCode 2 CLI/TUI plugin patterns.
- Uses native `ctx.ui.slot`, `ctx.data.on`, and TUI storage patterns.

Caveat: verify each API against the current official CLI plugin documentation before reusing it.

## OpenTUI community + official package

Repository: https://github.com/anomalyco/opentui

The current OpenTUI package publishes an AI-agent documentation skill. If a plugin requires custom OpenTUI component work beyond basic OpenCode slots/panels/dialogs, install/read that skill rather than reproducing OpenTUI documentation inside this starter.

## Selection rule

A community repository is a candidate reference only when:

1. it explicitly targets OpenCode 2 or contains an identifiable OpenCode 2 path;
2. its relevant code uses `@opencode/plugin` or the currently documented OpenCode 2 TUI context;
3. the API still exists in official docs/types;
4. the pattern reduces code or risk compared with inventing our own solution.

If any of those fail, use the repo only as conceptual inspiration.
