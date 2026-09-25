// Example: a full screen plugin route plus session tabs. Catalog: examples/README.md
// Context used: ui.router.register/navigate/current, ui.tabs.*, ui.dialog.select, keymap.layer, keymap.mode.push,
//               data.session, data.project, ui.format.path, theme
//
// A route is the escape hatch when a panel is too small. The host keeps ownership
// of the chrome, so a plugin page is just JSX plus a way in and out.
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { TextAttributes } from "@opentui/core"
import { For, Show, createMemo, onCleanup } from "solid-js"

const ID = "acme.dashboard"
const ROUTE = `${ID}.home`

export default Plugin.define({
  id: ID,
  setup(context) {
    // 1. Register the page. The returned function unregisters it, so `setup`
    //    hands it back as the plugin cleanup.
    const unregister = context.ui.router.register({
      name: ROUTE,
      render: () => <Dashboard />,
    })

    // 2. Reach it from a command, and go back to the host from the page itself.
    context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          priority: 10,
          commands: [
            {
              id: `${ID}.open`,
              title: "Dashboard: open",
              description: "Session overview as a full screen page",
              group: "Dashboard",
              palette: true,
              slash: { name: "dashboard" },
              run: () => {
                context.ui.router.navigate({ type: "plugin", name: ROUTE })
              },
            },
            {
              id: `${ID}.back`,
              title: "Dashboard: back to the session",
              group: "Dashboard",
              enabled: () => context.ui.router.current().type === "plugin",
              run: () => {
                context.ui.router.navigate({ type: "home" })
              },
            },
          ],
        }))
        return null
      },
    })

    return unregister
  },
})

function Dashboard() {
  const context = usePlugin()

  // A plugin screen can own its own input mode while it is mounted. Pushing one
  // and popping it on cleanup keeps the host's mode stack balanced.
  const popMode = context.keymap.mode.push(ID)
  onCleanup(popMode)

  context.keymap.layer(() => ({
    mode: ID,
    commands: [
      {
        id: `${ID}.leave`,
        title: "Leave the dashboard",
        bind: "escape",
        run: () => {
          context.ui.router.navigate({ type: "home" })
        },
      },
      {
        id: `${ID}.switch`,
        title: "Open a session in a tab",
        bind: "ctrl+o",
        run: () => {
          void openSession(context)
        },
      },
    ],
  }))

  const sessions = createMemo(() => [...context.data.session.list()].sort((a, b) => b.time.updated - a.time.updated))
  const projects = createMemo(() => context.data.project.list())
  // Narrow the route union inside the memo: a second call would not narrow.
  const routeLabel = createMemo(() => {
    const current = context.ui.router.current()
    return current.type === "plugin" ? current.id : current.type
  })

  return (
    <box flexDirection="column" gap={1} padding={1} width="100%">
      <box flexDirection="column">
        <text attributes={TextAttributes.BOLD} fg={context.theme.text.base}>
          acme.dashboard
        </text>
        <text fg={context.theme.text.muted}>
          {sessions().length} sessions · {projects().length} projects · escape to leave · ctrl+o to open a session
        </text>
      </box>

      <box flexDirection="column" border borderStyle="rounded" borderColor={context.theme.border.base} paddingX={1}>
        <text fg={context.theme.text.muted}>Recent sessions</text>
        <Show when={sessions().length > 0} fallback={<text fg={context.theme.text.muted}>no sessions yet</text>}>
          <box flexDirection="column">
            <For each={sessions().slice(0, 10)}>
              {(session) => (
                <box flexDirection="row" gap={2}>
                  <text fg={context.theme.text.base}>{session.title ?? session.id}</text>
                  <text fg={context.theme.text.muted}>
                    {context.data.session.status(session.id)} · {usd(context.data.session.cost(session.id))}
                  </text>
                </box>
              )}
            </For>
          </box>
        </Show>
      </box>

      <box flexDirection="column" border borderStyle="rounded" borderColor={context.theme.border.base} paddingX={1}>
        <text fg={context.theme.text.muted}>Location</text>
        <Row context={context} label="dir" value={context.ui.format.path(context.location?.directory ?? "-")} />
        <Row context={context} label="opencode" value={`${context.app.version}${context.app.channel ? ` · ${context.app.channel}` : ""}`} />
        <Row context={context} label="route" value={routeLabel()} />
      </box>

      <box flexGrow={1} />
    </box>
  )
}

async function openSession(context: ReturnType<typeof usePlugin>): Promise<void> {
  const sessions = [...context.data.session.list()].sort((a, b) => b.time.updated - a.time.updated)
  if (sessions.length === 0) return

  // Tabs are optional: they only exist when the host has them enabled.
  const picked = await context.ui.dialog.select<string>({
    title: context.ui.tabs.enabled() ? "Open session in a tab" : "Open session",
    options: sessions.slice(0, 20).map((session) => ({
      title: session.title ?? session.id,
      value: session.id,
      description: context.data.session.status(session.id),
    })),
  })
  if (!picked) return

  if (context.ui.tabs.enabled()) {
    context.ui.tabs.focus(picked)
    return
  }
  context.ui.router.navigate({ type: "session", sessionID: picked })
}

function Row(props: { readonly context: ReturnType<typeof usePlugin>; readonly label: string; readonly value: string }) {
  return (
    <box flexDirection="row" justifyContent="space-between" gap={1}>
      <text fg={props.context.theme.text.muted}>{props.label}</text>
      <text fg={props.context.theme.text.base} flexShrink={1}>
        {props.value}
      </text>
    </box>
  )
}

function usd(value: number): string {
  return `$${value.toFixed(4)}`
}
