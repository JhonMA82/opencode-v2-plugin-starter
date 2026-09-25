# OpenCode 2 Native API Map

This is a navigation aid, not a replacement for current official type definitions.

## Server plugin — `@opencode/plugin`

| Area | Native surface | Typical use |
|---|---|---|
| App/location/options | `ctx.app`, `ctx.location`, `ctx.options` | Runtime/version/location and plugin configuration |
| Agents | `ctx.agent` | list/get/transform/reload agents |
| Providers | `ctx.provider` | provider definitions, source models, reload |
| Models | `ctx.model` | list/default/transform/reload active model candidates |
| Commands | `ctx.command` | add/inspect/reload OpenCode commands |
| Integrations | `ctx.integration` | credentials, OAuth/command auth, transforms |
| MCP | `ctx.mcp` | inspect/transform/reload MCP servers |
| Plugins | `ctx.plugin` | inspect active plugins |
| References | `ctx.reference` | local/git references and transforms |
| Generation | `ctx.generate` | one-off model generation outside session history |
| Permissions | `ctx.permission` | inspect/reply/rules and permission hooks |
| Sessions | `ctx.session` | create/read/prompt/generate/command/wait/etc. |
| Skills | `ctx.skill` | list/transform/reload skills |
| Tools | `ctx.tool` | list/transform/reload tools; execution hooks |
| Storage | `ctx.storage` | durable plugin data |
| Events | `ctx.event` | subscribe to runtime events |
| VCS/worktree/web | documented `ctx.vcs`, `ctx.worktree`, `ctx.websearch` surfaces | host-native project/web operations |
| Lifecycle/hooks | documented hook registrations | prompt/context/compaction/model/http/shell/tool/etc. |

### Server design rule

Use the domain that owns the behavior. Do not shell out when the native domain API already exists.

Transform callbacks should be synchronous, cheap, deterministic and repeatable. Resolve external I/O before the transform and call the corresponding `reload()` when captured external state changes.

## CLI/TUI plugin — `@opencode/plugin/tui`

| Area | Native surface | Typical use |
|---|---|---|
| Runtime/location | `context.app`, `context.location`, `context.client` | host metadata + client access |
| Reactive data | `context.data.*` | session/project/location/shell data + listeners |
| Attention | `context.attention.notify` | native notifications |
| Theme/renderer | `context.theme`, `context.renderer` | host theme and renderer access |
| Plugin composition | `usePlugin()` | consume another active TUI plugin when documented |
| Markdown | `context.markdown.registerCodeBlockRenderer` | custom code block rendering |
| Keymaps/commands | `context.keymap.*` | layers, palette/slash commands, dispatch, modes |
| TUI storage | `context.storage.store`, `context.storage.memory` | persistent/in-memory UI state |
| Dialogs | `context.ui.dialog.*` | alert/confirm/prompt/select/custom dialogs |
| Toast | `context.ui.toast.show` | unobtrusive status feedback |
| Router | `context.ui.router.*` | register/navigate custom screens |
| Tabs | `context.tabs.*` | list/open/focus/move/close tabs |
| Model selector | documented model/variant UI APIs | host model/variant selection |
| Slots | `context.ui.slot(...)` | append/prepend/before/after/replace host surfaces |
| Panels | `context.ui.panel.*` | open/current/close plugin panels |
| Formatting | `context.format.path` | host-consistent path formatting |

### Useful slot names currently documented

```text
app
home.footer
home.footer.status
prompt.footer
prompt.footer.status
prompt.footer.file
session.composer.top
sidebar.content
sidebar.footer
session.panel
```

### TUI design rule

Use the TUI host. Do not create a second terminal renderer inside an embedded plugin. Register the smallest native surface needed: a slot for small status, a dialog for short interaction, a panel for contextual work, or a route for a full screen.

## Source of truth

- https://opencode.ai/v2/docs/build/plugins/
- https://opencode.ai/v2/docs/build/plugins/cli/

When this map and installed types disagree, installed current OpenCode 2 types + official docs win. Update this file after the code works.
