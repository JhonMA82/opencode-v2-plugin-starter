# Server Plugin Recipes

Use `@opencode/plugin`. Keep domain behavior here; keep terminal presentation in the TUI entrypoint.

## Minimal lifecycle + storage

```ts
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "acme.example",
  async setup(ctx) {
    await ctx.storage.set("loaded", true)
  },
})
```

`setup` may return a cleanup function for resources the plugin owns.

## Add a command through the native registry

```ts
await ctx.command.transform((editor) => {
  editor.add({
    name: "example-review",
    description: "Run the example review flow",
    execute: async ({ sessionID, prompt, delivery }) => {
      await ctx.session.prompt({
        ...prompt,
        sessionID,
        text: `Review this request:\n\n${prompt.text}`,
        delivery,
      })
    },
  })
})
```

## Transform registries, do not fork them

OpenCode 2 exposes transforms for domains such as agents, providers, models, commands, integrations, MCP, references, skills and tools. Prefer these registries over editing private files.

A safe pattern for external source data is:

```ts
const source = await loadExternalState()

await ctx.model.transform((editor) => {
  // Read from `source` synchronously and modify the editor.
})
```

If `source` changes later, update the captured value and call the relevant domain `reload()`.

## Sessions

Use `ctx.session` for host-managed work instead of manually emulating OpenCode sessions. Current APIs cover creation, context retrieval, agent/model switching, prompts, generation, commands, synthetic messages, interrupt, rename and wait.

## Permissions

Use `ctx.permission` rather than inventing another permission system. A plugin can inspect/reply to pending permission requests and install session-scoped rules through supported APIs.

## Events and hooks

Prefer native `ctx.event` subscriptions and documented lifecycle hooks. Hooks are useful when the behavior is inherently tied to a host event; do not use them when a direct transform or command is simpler.

## Checklist before adding server code

- Is there already a `ctx.*` domain for this?
- Can a transform solve it deterministically?
- Is external I/O outside the transform callback?
- Does anything opened by setup need cleanup?
- Does the TUI actually need to know this logic, or only display its result?
- Does `bun run verify` still pass?
