# Native OpenCode 2 Checklist

Before coding:

- [ ] Server import is `@opencode/plugin`.
- [ ] TUI import is `@opencode/plugin/tui`.
- [ ] Entrypoint uses `Plugin.define({ id, setup })`.
- [ ] Config key is `plugins`, plural.
- [ ] No implementation copied from a `/v2` package name without verifying it is the native OpenCode 2 contract.
- [ ] Official docs/types were checked first.
- [ ] Community pattern, if used, was checked against official docs/types.

Before completion:

- [ ] Server and TUI responsibilities are separated.
- [ ] Native OpenCode domains/primitives were preferred over custom infrastructure.
- [ ] Cleanup exists for owned resources that outlive setup.
- [ ] No second TUI renderer or bundled duplicate Solid/OpenTUI runtime was introduced.
- [ ] `bun run check:v2` passes.
- [ ] `bun run typecheck` passes.
- [ ] `bun test` passes.
- [ ] Runtime smoke test was run when needed.
