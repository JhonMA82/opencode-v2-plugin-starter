# Server Recipes

Import:

```ts
import { Plugin } from "@opencode/plugin"
```

Native entrypoint:

```ts
export default Plugin.define({
  id: "acme.plugin",
  async setup(ctx) {
    // Use ctx.* native domains directly.
  },
})
```

Prefer these native areas before creating infrastructure:

```text
agent/provider/model/command
integration/mcp/reference
session/permission/generate
tool/skill/storage/event
vcs/worktree/websearch
```

Common decision:

```text
modify a registry     -> domain transform
external source moved -> update captured state + domain.reload()
session action        -> ctx.session
persistent state      -> ctx.storage
runtime notification  -> ctx.event / documented hook
permission policy     -> ctx.permission + permission hook
```

Transforms should be cheap, synchronous, deterministic and repeatable. Perform network/filesystem I/O before the transform callback.

For deeper examples read `docs/SERVER-PLUGIN.md` and the current official OpenCode 2 plugin docs.
