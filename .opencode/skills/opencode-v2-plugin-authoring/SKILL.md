---
name: opencode-v2-plugin-authoring
description: Build or extend native OpenCode 2 server and CLI/TUI plugins without falling back to OpenCode 1 or transitional APIs.
---

# OpenCode 2 Plugin Authoring

Use this skill whenever a task creates, extends, reviews, or migrates a plugin in this repository.

## Required first reads

1. `AGENTS.md`
2. `docs/V2-COMPATIBILITY.md`
3. `examples/README.md` — the catalog of runnable TUI examples
4. The focused reference for the requested surface:
   - `references/server-recipes.md`
   - `references/tui-recipes.md`

Read `docs/API-MAP.md` only when you need to discover which native domain owns a feature.

## Use the examples, do not reinvent them

`examples/` holds a working plugin for each TUI surface: side panel, status rows, dialogs, settings list. Before
writing new TUI code, find the closest example: extend it in place, or copy it and rename.

An example only reads the `context` it is handed — no module state, no wrappers, no helper layer. Making one show
something new means adding a `context.*` read inside a `render` or a `run`, styled with `context.theme.*` tokens.
`tests/contracts.test.ts` enforces that, along with unique ids, free slash names, and an `@opencode/plugin` pin that
matches the starter.

## Workflow

1. Classify the change as server, TUI, or both.
2. Search current official OpenCode 2 docs/types before inventing an API.
3. Search current community examples if a real implementation pattern would help.
4. Reject examples based on `@opencode-ai/plugin*` as implementation contracts.
5. Prefer direct native `@opencode/plugin` APIs.
6. Make the smallest change that satisfies the feature.
7. Keep TUI presentation separate from server/domain logic.
8. Run `bun run verify`.
9. For host-dependent behavior, smoke-test in OpenCode 2 and state the evidence.

## Hard stop conditions

Do not continue silently if:

- official docs and installed types materially disagree;
- the feature appears to require an undocumented/private API;
- a community example only works through an OpenCode 1 compatibility layer.

Instead, identify the mismatch and choose the smallest documented alternative.

## Do not add by default

- custom dependency injection;
- plugin registry wrappers;
- custom event buses;
- custom state frameworks;
- parallel terminal renderers;
- compatibility layers for OpenCode 1;
- speculative directories/capabilities.

Add infrastructure only after a concrete plugin requirement proves the native OpenCode 2 API is insufficient.
