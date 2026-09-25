// Example: slot placement and the remaining host surfaces. Catalog: examples/README.md
// Context used: ui.slot with prepend/append/before/after/replace, sidebar.content, sidebar.footer,
//               session.composer.top, prompt.footer.file, theme
//
// Every example so far used `append`. Placement is the other half of the slot
// contract: `prepend`/`append` stay inside the target, `before`/`after` sit next
// to it, and `replace` takes it over. `replace` is the dangerous one, so use it
// only for a surface the plugin genuinely owns.
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { For, Show } from "solid-js"

const ID = "acme.slots"

export default Plugin.define({
  id: ID,
  setup(context) {
    // The home footer takes all four non-destructive placements on one path, so
    // their difference is visible side by side.
    context.ui.slot({
      prepend: "home.footer",
      render: () => <Chip label="prepend" />,
    })
    context.ui.slot({
      append: "home.footer",
      render: () => <Chip label="append" />,
    })
    context.ui.slot({
      before: "home.footer",
      render: () => <Chip label="before" />,
    })
    context.ui.slot({
      after: "home.footer",
      render: () => <Chip label="after" />,
    })

    // The session sidebar is the natural home for a persistent, session-scoped
    // summary. Both paths take the session id, so nothing has to be looked up.
    context.ui.slot({
      append: "sidebar.content",
      render: (input) => <SidebarSummary sessionID={input.sessionID} />,
    })
    context.ui.slot({
      append: "sidebar.footer",
      render: (input) => {
        const session = context.data.session.get(input.sessionID)
        if (!session) return null
        return (
          <text fg={context.theme.text.muted}>
            {context.data.session.status(input.sessionID)} · {context.data.session.cost(input.sessionID).toFixed(4)}
          </text>
        )
      },
    })

    // Above the composer, where a hint about the current session belongs.
    context.ui.slot({
      append: "session.composer.top",
      render: (input) => (
        <Show when={context.data.session.get(input.sessionID)?.parentID}>
          <text fg={context.theme.text.muted}>child session</text>
        </Show>
      ),
    })

    // The prompt's file row, for a plugin that contributes a file-like chip.
    context.ui.slot({
      append: "prompt.footer.file",
      render: (input) => (
        <Show when={input.mode === "shell"}>
          <text fg={context.theme.text.feedback.info.base}>shell</text>
        </Show>
      ),
    })
  },
})

function Chip(props: { readonly label: string }) {
  const context = usePlugin()
  return (
    <box flexDirection="row" gap={1}>
      <text fg={context.theme.text.muted}>slots:</text>
      <text fg={context.theme.text.base}>{props.label}</text>
    </box>
  )
}

function SidebarSummary(props: { readonly sessionID: string }) {
  const context = usePlugin()
  const family = () => context.data.session.family(props.sessionID)
  return (
    <box flexDirection="column">
      <text fg={context.theme.text.muted}>acme.slots</text>
      <For each={family().slice(0, 4)}>
        {(id) => (
          <text fg={context.theme.text.base}>{context.data.session.get(id)?.title ?? id}</text>
        )}
      </For>
    </box>
  )
}
