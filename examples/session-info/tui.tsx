// Example: session information in the side panel. Catalog: examples/README.md
// Context used: ui.slot(session.panel), ui.panel.open, keymap.layer, data.session, data.location, format.path, theme
// To change what it shows, add a `context.data.*` read and render it. Do not add state or a helper layer.
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import type { PanelInput } from "@opencode/plugin/tui/context"
import { TextAttributes } from "@opentui/core"
import type { ColorInput } from "@opentui/core"
import { For, Show, createEffect, createMemo } from "solid-js"
import type { JSX } from "solid-js"

const PLUGIN_ID = "acme.session-info"
const PANEL_NAME = "acme.session-info.panel"

export default Plugin.define({
  id: PLUGIN_ID,
  async setup(context) {
    // 1. Panel contribution. `session.panel` is an ordinary slot: every plugin
    //    appends to it and each contribution decides whether the selected name
    //    is its own. `PanelInput` is reactive (name, sessionID, width,
    //    presentation, focused) plus focus/close/toggleFullscreen actions.
    context.ui.slot({
      append: "session.panel",
      render: (panel) => (
        <Show when={panel.name === PANEL_NAME}>
          <SessionInfoPanel panel={panel} />
        </Show>
      ),
    })

    // 2. The command that selects this panel. The layer is created from inside
    //    the `app` slot render, so the host owns its lifetime and the slash
    //    command stays reachable for the whole session.
    context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          priority: 10,
          commands: [
            {
              id: "acme.session-info.open",
              title: "Session info: open panel",
              description: "Show session and environment information in the side panel",
              group: "Session info",
              palette: true,
              slash: { name: "info" },
              run: () => {
                // Returns false (renders nothing) when opened outside a session.
                context.ui.panel.open(PANEL_NAME)
              },
            },
          ],
        }))
        return null
      },
    })

    // 3. Warm location-scoped data last, so the surfaces above are already
    //    registered while it loads. The panel body then reads it reactively.
    const location = context.location ?? context.data.location.default()
    await Promise.all([
      context.data.location.vcs.sync(location),
      context.data.location.agent.sync(location),
      context.data.location.command.sync(location),
      context.data.location.mcp.server.sync(location),
      context.data.location.skill.sync(location),
    ])
  },
})

function SessionInfoPanel(props: { readonly panel: PanelInput }) {
  const context = usePlugin()
  const sessionID = () => props.panel.sessionID

  // Session-scoped caches belong to one session, so refresh them whenever the
  // host points the panel at a different session.
  createEffect(() => {
    const id = sessionID()
    void context.data.session.sync(id)
    void context.data.session.message.sync(id)
    void context.data.session.pending.sync(id)
    void context.data.session.permission.sync(id)
  })

  // Panel keyboard layers are reachable only while the panel owns input.
  context.keymap.layer(() => ({
    commands: [
      {
        id: "acme.session-info.fullscreen",
        title: "Toggle full screen presentation",
        bind: "f",
        run: () => {
          props.panel.toggleFullscreen()
        },
      },
      {
        id: "acme.session-info.refresh",
        title: "Refresh session and location data",
        bind: "r",
        run: () => {
          const id = sessionID()
          void context.data.session.sync(id)
          void context.data.session.message.sync(id)
          void context.data.session.pending.sync(id)
          void context.data.session.permission.sync(id)
          void context.data.location.vcs.sync(context.location)
        },
      },
    ],
  }))

  const session = createMemo(() => context.data.session.get(sessionID()))
  const status = createMemo(() => context.data.session.status(sessionID()))
  const messages = createMemo(() => context.data.session.message.list(sessionID()).length)
  const pending = createMemo(() => context.data.session.pending.list(sessionID()).length)
  const permissions = createMemo(() => context.data.session.permission.list(sessionID())?.length ?? 0)
  const children = createMemo(() => context.data.session.list().filter((item) => item.parentID === sessionID()))

  // The host owns the panel size: shorten the id to whatever space exists.
  const shortID = createMemo(() => {
    const id = sessionID()
    const room = Math.max(6, Math.floor(props.panel.width / 2))
    return id.length > room ? `${id.slice(0, room)}…` : id
  })

  const vcs = createMemo(() => context.data.location.vcs.info(context.location))
  const locationCounts = createMemo(() => ({
    agents: context.data.location.agent.list(context.location)?.length ?? 0,
    commands: context.data.location.command.list(context.location)?.length ?? 0,
    mcp: context.data.location.mcp.server.list(context.location)?.length ?? 0,
    skills: context.data.location.skill.list(context.location)?.length ?? 0,
  }))

  const directory = createMemo(() => session()?.location.directory ?? context.location?.directory ?? "")
  const cache = createMemo(() => {
    const usage = session()?.tokens
    return usage ? usage.cache.read + usage.cache.write : 0
  })

  return (
    <box flexDirection="column" gap={1} padding={1} width="100%">
      <box flexDirection="column">
        <text attributes={TextAttributes.BOLD} fg={context.theme.text.base}>
          {session()?.title ?? "Untitled session"}
        </text>
        <text fg={context.theme.text.muted}>{shortID()}</text>
      </box>

      <Section title="Session">
        <StatusRow status={status()} />
        <Row label="model" value={describeModel(session()?.model)} />
        <Row label="agent" value={session()?.agent ?? "default"} />
        <Row label="messages" value={String(messages())} />
        <Row label="pending" value={String(pending())} />
        <Row
          label="permissions"
          value={String(permissions())}
          valueColor={permissions() > 0 ? context.theme.text.feedback.warning.base : undefined}
        />
        <Row label="cost" value={usd(context.data.session.cost(sessionID()))} />
        <Row label="tokens in" value={compact(session()?.tokens.input ?? 0)} />
        <Row label="tokens out" value={compact(session()?.tokens.output ?? 0)} />
        <Row label="cache" value={compact(cache())} />
        <Row label="updated" value={clock(session()?.time.updated)} />
        <Row label="dir" value={directory() ? context.ui.format.path(directory()) : "-"} />
      </Section>

      <Section title="Environment">
        <Row
          label="opencode"
          value={context.app.channel ? `${context.app.version} · ${context.app.channel}` : context.app.version}
        />
        <Row label="git" value={describeBranch(vcs())} />
        <Row label="agents" value={String(locationCounts().agents)} />
        <Row label="commands" value={String(locationCounts().commands)} />
        <Row label="mcp" value={String(locationCounts().mcp)} />
        <Row label="skills" value={String(locationCounts().skills)} />
      </Section>

      <Section title={`Children (${children().length})`}>
        <Show
          when={children().length > 0}
          fallback={<text fg={context.theme.text.muted}>no child sessions</text>}
        >
          <box flexDirection="column">
            <For each={children().slice(0, 6)}>
              {(child) => <text fg={context.theme.text.base}>{child.title ?? child.id}</text>}
            </For>
            <Show when={children().length > 6}>
              <text fg={context.theme.text.muted}>+{children().length - 6} more</text>
            </Show>
          </box>
        </Show>
      </Section>

      <box flexGrow={1} />
      <text fg={context.theme.text.muted}>
        {props.panel.presentation === "fullscreen" ? "full screen" : "side panel"} · f full screen · r refresh
      </text>
    </box>
  )
}

function Section(props: { readonly title: string; readonly children: JSX.Element }) {
  const context = usePlugin()
  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={context.theme.border.base}
      backgroundColor={context.theme.background.raised.base}
      paddingX={1}
    >
      <text fg={context.theme.text.muted}>{props.title}</text>
      {props.children}
    </box>
  )
}

function Row(props: { readonly label: string; readonly value: string; readonly valueColor?: ColorInput }) {
  const context = usePlugin()
  return (
    <box flexDirection="row" justifyContent="space-between" gap={1}>
      <text fg={context.theme.text.muted}>{props.label}</text>
      <text fg={props.valueColor ?? context.theme.text.base} flexShrink={1}>
        {props.value}
      </text>
    </box>
  )
}

function StatusRow(props: { readonly status: "idle" | "running" }) {
  const context = usePlugin()
  const color = () => (props.status === "running" ? context.theme.text.feedback.info.base : context.theme.text.muted)
  return (
    <box flexDirection="row" justifyContent="space-between" gap={1}>
      <text fg={context.theme.text.muted}>status</text>
      <text fg={color()} attributes={props.status === "running" ? TextAttributes.BOLD : TextAttributes.NONE}>
        {props.status}
      </text>
    </box>
  )
}

function describeModel(ref: { providerID: string; id: string; variant?: string } | undefined): string {
  if (!ref) return "unknown"
  return ref.variant ? `${ref.providerID}/${ref.id} · ${ref.variant}` : `${ref.providerID}/${ref.id}`
}

function describeBranch(vcs: { branch: { current?: string }; provider?: string } | undefined): string {
  if (!vcs?.branch.current) return "not a git repository"
  return vcs.provider ? `${vcs.branch.current} · ${vcs.provider}` : vcs.branch.current
}

function usd(value: number): string {
  return `$${value.toFixed(4)}`
}

function compact(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}k`
  return `${(value / 1_000_000).toFixed(1)}M`
}

function clock(ms: number | undefined): string {
  if (!ms) return "-"
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
