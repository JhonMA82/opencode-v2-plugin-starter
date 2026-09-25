// Example: status items in the host status rows. Catalog: examples/README.md
// Context used: ui.slot(prompt.footer.status | home.footer.status), keymap.layer, storage.memory, data.session,
//               data.location.vcs, theme
// To change what it shows, add a `context.data.*` read and render it. Do not add state or a helper layer.
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import type { ColorInput } from "@opentui/core"
import { Show, createMemo, createSignal, onCleanup } from "solid-js"

const PLUGIN_ID = "acme.status-bar"

export default Plugin.define({
  id: PLUGIN_ID,
  async setup(context) {
    // The one thing this plugin owns is a view preference, so it belongs in TUI
    // memory: it survives hot reloads and dies with the process. A durable store
    // would be wrong for a display toggle.
    const [settings, setSettings] = context.storage.memory(PLUGIN_ID, {
      initial: { detailed: false },
    })

    // `prompt.footer.status` is the status row under the composer. The host
    // owns the row: contributions land after its health indicators and before
    // the version, so this plugin only adds items, never a row of its own.
    context.ui.slot({
      append: "prompt.footer.status",
      render: (input) => <PromptStatus input={input} detailed={settings.detailed} />,
    })

    // `home.footer.status` is the same idea on the home screen. It publishes no
    // input, so the render takes none.
    context.ui.slot({
      append: "home.footer.status",
      render: () => <HomeStatus detailed={settings.detailed} />,
    })

    // A status bar is cheap to re-read but noisy to stare at, so the amount of
    // detail is toggleable. The layer is created from a rendered slot so the
    // host owns its lifetime; the command has a stable id, so a user can also
    // bind it in `cli.json` instead of using the palette or the slash name.
    context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          priority: 10,
          commands: [
            {
              id: "acme.status-bar.toggle",
              title: "Status bar: toggle detail",
              group: "Status bar",
              palette: true,
              slash: { name: "statusbar" },
              run: () => {
                setSettings((draft) => {
                  draft.detailed = !draft.detailed
                })
              },
            },
          ],
          bindings: ["acme.status-bar.toggle"],
        }))
        return null
      },
    })

    // One warm-up read so the branch is present on the first frame.
    await context.data.location.vcs.sync(context.location)
  },
})

type PromptFooter = {
  readonly sessionID?: string
  readonly mode: "normal" | "shell"
  readonly showDetails: boolean
}

function PromptStatus(props: { readonly input: PromptFooter; readonly detailed: boolean }) {
  const context = usePlugin()
  const branch = createMemo(() => context.data.location.vcs.info(context.location)?.branch.current)
  const session = createMemo(() =>
    props.input.sessionID ? context.data.session.get(props.input.sessionID) : undefined,
  )

  return (
    <box flexDirection="row" gap={2}>
      <Show when={branch()}>{(value) => <Item label="git" value={value()} />}</Show>
      <Show when={props.input.mode === "shell"}>
        <Item label="mode" value="shell" accent={context.theme.text.feedback.info.base} />
      </Show>
      <Show when={props.detailed && session()}>
        <Item label="model" value={describeModel(session()?.model)} />
        <Item label="cost" value={usd(context.data.session.cost(props.input.sessionID!))} />
        <Item label="msgs" value={String(context.data.session.message.list(props.input.sessionID!).length)} />
      </Show>
      <Show when={props.input.showDetails && session()}>
        <Item label="status" value={context.data.session.status(props.input.sessionID!)} />
      </Show>
      <Clock />
    </box>
  )
}

function HomeStatus(props: { readonly detailed: boolean }) {
  const context = usePlugin()
  const branch = createMemo(() => context.data.location.vcs.info(context.location)?.branch.current)
  const sessions = createMemo(() => context.data.session.list().length)

  return (
    <box flexDirection="row" gap={2}>
      <Item label="opencode" value={context.app.version} />
      <Show when={props.detailed}>
        <Show when={context.app.channel}>{(value) => <Item label="channel" value={value()} />}</Show>
        <Item label="sessions" value={String(sessions())} />
      </Show>
      <Show when={branch()}>{(value) => <Item label="git" value={value()} />}</Show>
      <Clock />
    </box>
  )
}

function Item(props: { readonly label: string; readonly value: string; readonly accent?: ColorInput }) {
  const context = usePlugin()
  return (
    <box flexDirection="row" gap={1}>
      <text fg={context.theme.text.muted}>{props.label}</text>
      <text fg={props.accent ?? context.theme.text.base}>{props.value}</text>
    </box>
  )
}

function Clock() {
  const context = usePlugin()
  const [now, setNow] = createSignal(new Date())
  const timer = setInterval(() => setNow(new Date()), 30_000)
  onCleanup(() => clearInterval(timer))
  return (
    <text fg={context.theme.text.muted}>
      {now().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </text>
  )
}

function describeModel(ref: { providerID: string; id: string; variant?: string } | undefined): string {
  if (!ref) return "unknown"
  const name = ref.id.includes("/") ? ref.id.slice(ref.id.lastIndexOf("/") + 1) : ref.id
  return ref.variant ? `${name} ${ref.variant}` : name
}

function usd(value: number): string {
  return `$${value.toFixed(4)}`
}
