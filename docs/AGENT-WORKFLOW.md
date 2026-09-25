# Agent Workflow

This is the shortest safe workflow for creating a plugin from this starter.

## 1. Classify the request

Decide which host surface owns the feature:

```text
server behavior / hooks / transforms / tools / sessions -> src/index.ts
terminal presentation / interaction                    -> src/tui.tsx
both                                                     -> keep two entrypoints; share only neutral data/types if necessary
```

## 2. Search before coding

Search in this order:

1. official OpenCode 2 plugin docs;
2. official OpenCode 2 CLI/TUI docs;
3. installed `@opencode/plugin` types;
4. current OpenCode source if needed;
5. GitHub/npm examples targeting OpenCode 2.

Write down only the API surfaces actually required by the feature.

## 3. Check whether native OpenCode already solves it

Examples:

- custom command -> command transform / TUI keymap command;
- plugin state -> host storage;
- small UI -> slot;
- contextual UI -> panel;
- short form -> dialog;
- full screen -> route;
- session work -> `ctx.session`;
- policy -> native transform/hook/permission API;
- provider/model customization -> provider/model transforms;
- MCP changes -> `ctx.mcp` transform;
- skill/tool changes -> native skill/tool domain.

Do not create a new subsystem when one of these is sufficient.

## 4. Implement the smallest slice

Start in the existing entrypoint. Add a file only if separation is justified by reuse, tests, or a clear independent responsibility.

Do not pre-build future capabilities.

For TUI work, check `examples/README.md` first: a side panel, status rows, dialogs and a settings list already exist as runnable plugins. Extending the closest one beats writing new plumbing, because an example only reads the `context` it is handed.

## 5. Keep UI thin

The TUI should observe or invoke behavior, not duplicate server logic. Prefer host state (`context.data`) and host presentation primitives.

## 6. Run the deterministic gate

```bash
bun run verify
```

Then run a real OpenCode 2 smoke test for behavior that depends on runtime integration.

## 7. Document only the new contract

If the plugin introduced a new native API category, add one concise recipe to the appropriate focused document or skill reference. Avoid copying the entire upstream API.

## Completion report

An agent should report:

- files changed;
- native OpenCode 2 APIs used;
- community/official references consulted when relevant;
- verification commands and results;
- any part that could not be smoke-tested.
