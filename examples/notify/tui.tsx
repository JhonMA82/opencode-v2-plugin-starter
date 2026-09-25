// Example: react to host events and notify. Catalog: examples/README.md
// Context used: data.on / data.listen, attention.notify, ui.toast.show, storage.memory, theme
//
// This is the bridge from server events to the terminal: a plugin never polls,
// it subscribes. `data.on` takes one typed event, `data.listen` takes all of them,
// and both return an unsubscribe function.
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { Show } from "solid-js"

const ID = "acme.notify"

export default Plugin.define({
  id: ID,
  setup(context) {
    // Whether to make noise is a view preference for this process, not data.
    const [settings, setSettings] = context.storage.memory(ID, {
      initial: { sound: false, onlyWhenBlurred: true },
    })

    // A finished run is the event a person actually wants to know about. The
    // event name and its payload are typed, so a typo or a removed event fails
    // the typecheck: session events carry `data.sessionID`.
    const stopExecution = context.data.on("session.execution.succeeded", (event) => {
      const session = context.data.session.get(event.data.sessionID)
      void announce(context, session?.title ?? "session", settings)
    })

    const stopFailure = context.data.on("session.execution.failed", (event) => {
      const session = context.data.session.get(event.data.sessionID)
      void announce(context, session?.title ?? "session", settings, true)
    })

    context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          priority: 10,
          commands: [
            {
              id: `${ID}.toggle-sound`,
              title: "Notify: toggle sound",
              group: "Notify",
              palette: true,
              run: () => {
                setSettings((draft) => {
                  draft.sound = !draft.sound
                })
              },
            },
            {
              id: `${ID}.toggle-focus`,
              title: "Notify: only when the terminal is blurred",
              group: "Notify",
              palette: true,
              run: () => {
                setSettings((draft) => {
                  draft.onlyWhenBlurred = !draft.onlyWhenBlurred
                })
              },
            },
            {
              id: `${ID}.test`,
              title: "Notify: test the notification",
              group: "Notify",
              palette: true,
              run: () => {
                void announce(context, "test notification", settings, false, true)
              },
            },
          ],
        }))
        return null
      },
    })

    // Make the current preference visible, so a toggle is never a guess.
    context.ui.slot({
      append: "prompt.footer.status",
      render: () => (
        <box flexDirection="row" gap={2}>
          <Show when={settings.sound}>
            <text fg={context.theme.text.muted}>notify:sound</text>
          </Show>
          <Show when={settings.onlyWhenBlurred}>
            <text fg={context.theme.text.muted}>notify:blurred</text>
          </Show>
        </box>
      ),
    })

    // Subscriptions are the plugin's resources: return their cleanup.
    return () => {
      stopExecution()
      stopFailure()
    }
  },
})

type Settings = { readonly sound: boolean; readonly onlyWhenBlurred: boolean }

async function announce(
  context: ReturnType<typeof usePlugin>,
  subject: string,
  settings: Settings,
  failed = false,
  force = false,
): Promise<void> {
  const message = failed ? `${subject} failed` : `${subject} finished`
  // `when` mirrors the host's own attention config, so the plugin never rings
  // when the user asked for silence.
  const result = await context.attention.notify({
    title: "acme.notify",
    message,
    notification: { when: settings.onlyWhenBlurred && !force ? "blurred" : "always" },
    sound: settings.sound ? { name: failed ? "error" : "done", when: "always" } : false,
  })
  // The host reports what it actually did, so the toast can be honest about it.
  if (result.skipped) {
    context.ui.toast.show({ message: `${message} (${result.skipped})`, variant: failed ? "error" : "info" })
  }
}
