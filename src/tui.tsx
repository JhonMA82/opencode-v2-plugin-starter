import { Plugin } from "@opencode/plugin/tui"
import { Show } from "solid-js"
import { PANEL_ID, TUI_PLUGIN_ID } from "./constants"

export default Plugin.define({
  id: TUI_PLUGIN_ID,
  setup(context) {
    context.ui.slot({
      append: "prompt.footer.status",
      render: () => <text fg={context.theme.text.muted}>native-v2</text>,
    })

    context.ui.slot({
      append: "session.panel",
      render: (panel) => (
        <Show when={panel.name === PANEL_ID}>
          <box flexDirection="column" padding={1} gap={1}>
            <text fg={context.theme.text.base}>OpenCode 2 native plugin starter</text>
            <text fg={context.theme.text.muted}>This panel is rendered through the host TUI API.</text>
            <text fg={context.theme.text.muted}>Press Escape to return to the session.</text>
          </box>
        </Show>
      ),
    })

    // Command layers are created from a rendered slot, not from setup, so the
    // host owns the layer lifetime.
    context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          priority: 10,
          commands: [
            {
              id: "starter.open-panel",
              title: "Starter: Open panel",
              group: "Starter",
              palette: true,
              slash: { name: "starter" },
              run: () => {
                context.ui.panel.open(PANEL_ID)
              },
            },
          ],
        }))
        return null
      },
    })
  },
})
