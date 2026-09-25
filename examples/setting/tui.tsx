// Example: a settings list that opens per-section options. Catalog: examples/README.md
// Context used: ui.dialog.select/confirm/alert, ui.toast.show, ui.slot(prompt.footer.status), keymap.layer,
//               storage.store (durable, async), theme
// To change what it shows, add a section here and a `context.ui.dialog.select` for it. Do not add state or a
// helper layer.
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { Show, createMemo, createSignal, onCleanup } from "solid-js"

const PLUGIN_ID = "acme.setting"
const SETTINGS_KEY = `${PLUGIN_ID}.settings`

type Profile = "default" | "compact" | "verbose"
type Notify = "all" | "blurred" | "off"
type Settings = {
  profile: Profile
  clock: boolean
  notify: Notify
}

const INITIAL: Settings = { profile: "default", clock: true, notify: "blurred" }

const PROFILES = [
  { title: "Por defecto", value: "default", description: "Rama, reloj y badge de modo shell" },
  { title: "Compacto", value: "compact", description: "Solo la rama" },
  { title: "Detallado", value: "verbose", description: "Todo, con etiqueta de perfil" },
] satisfies readonly { title: string; value: Profile; description: string }[]

const NOTIFY = [
  { title: "Siempre", value: "all", description: "Notificar con la ventana enfocada o no" },
  { title: "Solo sin foco", value: "blurred", description: "Notificar únicamente si el terminal pierde foco" },
  { title: "Desactivado", value: "off", description: "No notificar nunca" },
] satisfies readonly { title: string; value: Notify; description: string }[]

const SECTIONS = [
  { title: "Perfil", value: "profile" },
  { title: "Reloj", value: "clock" },
  { title: "Notificaciones", value: "notify" },
  { title: "Restablecer", value: "reset" },
  { title: "Acerca de", value: "about" },
] as const

type Section = (typeof SECTIONS)[number]["value"]

export default Plugin.define({
  id: PLUGIN_ID,
  setup(context) {
    // Settings are the one thing here that must outlive the process, so they go
    // to durable storage. The returned store stays live-synced across TUI
    // instances, and its mutations are async.
    const [settings, setSettings] = context.storage.store<Settings>(SETTINGS_KEY, { initial: INITIAL })

    context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          priority: 10,
          commands: [
            {
              id: "acme.setting.open",
              title: "Setting: open",
              description: "Browse settings, then open a section",
              group: "Setting",
              palette: true,
              slash: { name: "setting" },
              run: () => {
                void openSettings(context, settings, setSettings)
              },
            },
          ],
          bindings: ["acme.setting.open"],
        }))
        return null
      },
    })

    // The settings are only worth having if something reads them, so this
    // plugin renders its own status item. It coexists with any other plugin
    // contributing to the same slot.
    context.ui.slot({
      append: "prompt.footer.status",
      render: () => <SettingsStatus settings={settings} />,
    })
  },
})

type Context = ReturnType<typeof usePlugin>
type SetSettings = (mutation: (draft: Settings) => void) => Promise<void>

async function openSettings(context: Context, settings: Settings, setSettings: SetSettings) {
  // Level 1: the section list. Each row shows the value currently in effect,
  // which is what makes a settings list readable at a glance.
  const section = await context.ui.dialog.select<Section>({
    title: "Ajustes",
    placeholder: "Elige una sección",
    options: SECTIONS.map((item) => ({
      title: item.title,
      value: item.value,
      description: describe(settings, item.value),
    })),
  })
  if (!section) return

  // Level 2: the options of that section. `current` preselects the live value.
  switch (section) {
    case "profile": {
      const picked = await context.ui.dialog.select<Profile>({
        title: "Perfil",
        current: settings.profile,
        options: [...PROFILES],
      })
      if (!picked) return
      await setSettings((draft) => {
        draft.profile = picked
      })
      context.ui.toast.show({ message: `Perfil: ${picked}`, variant: "success" })
      return
    }
    case "clock": {
      const picked = await context.ui.dialog.select<boolean>({
        title: "Reloj",
        current: settings.clock,
        options: [
          { title: "Activado", value: true, description: "Muestra la hora en la barra de estado" },
          { title: "Desactivado", value: false, description: "Oculta la hora" },
        ],
      })
      if (picked === undefined) return
      await setSettings((draft) => {
        draft.clock = picked
      })
      context.ui.toast.show({ message: `Reloj: ${picked ? "activado" : "desactivado"}`, variant: "success" })
      return
    }
    case "notify": {
      const picked = await context.ui.dialog.select<Notify>({
        title: "Notificaciones",
        current: settings.notify,
        options: [...NOTIFY],
      })
      if (!picked) return
      await setSettings((draft) => {
        draft.notify = picked
      })
      context.ui.toast.show({ message: `Notificaciones: ${picked}`, variant: "success" })
      return
    }
    case "reset": {
      const confirmed = await context.ui.dialog.confirm({
        title: "Restablecer",
        message: "Volver a los valores de fábrica.",
        label: { confirm: "Restablecer", cancel: "Cancelar" },
      })
      if (!confirmed) return
      await setSettings((draft) => {
        Object.assign(draft, INITIAL)
      })
      context.ui.toast.show({ message: "Ajustes restablecidos", variant: "warning" })
      return
    }
    case "about": {
      await context.ui.dialog.alert({
        title: "Acerca de",
        message: `opencode ${context.app.version}${context.app.channel ? ` (${context.app.channel})` : ""} · acme.setting guarda sus preferencias de forma duradera.`,
      })
      return
    }
  }
}

function describe(settings: Settings, section: Section): string {
  switch (section) {
    case "profile":
      return PROFILES.find((item) => item.value === settings.profile)?.title ?? settings.profile
    case "clock":
      return settings.clock ? "Activado" : "Desactivado"
    case "notify":
      return NOTIFY.find((item) => item.value === settings.notify)?.title ?? settings.notify
    case "reset":
      return "Volver a los valores de fábrica"
    case "about":
      return "Versión y detalles del plugin"
  }
}

function SettingsStatus(props: { readonly settings: Settings }) {
  const context = usePlugin()
  const [now, setNow] = createSignal(new Date())
  const timer = setInterval(() => setNow(new Date()), 30_000)
  onCleanup(() => clearInterval(timer))

  const compact = createMemo(() => props.settings.profile === "compact")
  const verbose = createMemo(() => props.settings.profile === "verbose")

  return (
    <box flexDirection="row" gap={2}>
      <Show when={verbose()}>
        <box flexDirection="row" gap={1}>
          <text fg={context.theme.text.muted}>perfil</text>
          <text fg={context.theme.text.base}>{props.settings.profile}</text>
        </box>
      </Show>
      <Show when={!compact()}>
        <box flexDirection="row" gap={1}>
          <text fg={context.theme.text.muted}>notif</text>
          <text
            fg={
              props.settings.notify === "off"
                ? context.theme.text.feedback.warning.base
                : context.theme.text.base
            }
          >
            {props.settings.notify}
          </text>
        </box>
      </Show>
      <Show when={props.settings.clock}>
        <text fg={context.theme.text.muted}>
          {now().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </text>
      </Show>
    </box>
  )
}
