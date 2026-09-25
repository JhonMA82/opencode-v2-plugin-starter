// Example: promise dialogs plus a plugin-owned modal. Catalog: examples/README.md
// Context used: ui.dialog.alert/confirm/select/set/show/clear, ui.toast.show, keymap.layer, storage.memory,
//               data.session, data.location.vcs, theme, usePlugin()
// To change the flow, change which `context.ui.dialog.*` call the command awaits. Do not build a dialog framework.
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { For, Show } from "solid-js"

const PLUGIN_ID = "acme.dialog"
const NOTES_KEY = `${PLUGIN_ID}.notes`
const PICK_KEY = `${PLUGIN_ID}.last-pick`

export default Plugin.define({
  id: PLUGIN_ID,
  setup(context) {
    // Dialog choices are per-user view state for this TUI process, not data the
    // plugin owns on disk, so they live in TUI memory.
    const [preferences, setPreferences] = context.storage.memory(PICK_KEY, {
      initial: { lastPick: "" },
    })

    // Dialogs are modal, so every entry point is a command. The layer is created
    // from a rendered slot so the host owns its lifetime; each command has a
    // stable id, so a user can bind a key in `cli.json` instead of using the
    // palette or the slash name.
    context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          priority: 10,
          commands: [
            {
              id: "acme.dialog.report",
              title: "Dialog: session report",
              description: "Pick a session, then read a one line report",
              group: "Dialog",
              palette: true,
              slash: { name: "report" },
              run: () => {
                void report(context, setPreferences, preferences.lastPick)
              },
            },
            {
              id: "acme.dialog.notes",
              title: "Dialog: session notes",
              description: "A custom JSX dialog with its own keys",
              group: "Dialog",
              palette: true,
              slash: { name: "notes" },
              run: () => {
                // `set` sizes the dialog, `show` mounts plugin JSX inside the
                // host's modal chrome, `clear` is how a plugin closes it.
                context.ui.dialog.set({ size: "medium", centered: true })
                context.ui.dialog.show(() => <NotesDialog />)
              },
            },
          ],
          bindings: ["acme.dialog.report", "acme.dialog.notes"],
        }))
        return null
      },
    })
  },
})

type Preferences = { readonly lastPick: string }
type SetPreferences = (mutation: (draft: { lastPick: string }) => void) => void

async function report(
  context: ReturnType<typeof usePlugin>,
  setPreferences: SetPreferences,
  lastPick: string,
) {
  const sessions = context.data.session.list()
  if (sessions.length === 0) {
    await context.ui.dialog.alert({ title: "Session report", message: "No sessions yet." })
    return
  }

  // `select` resolves to undefined when the user cancels, so every dialog result
  // has to be treated as optional.
  const picked = await context.ui.dialog.select<string>({
    title: "Session report",
    placeholder: "Pick a session",
    current: lastPick || undefined,
    options: sessions.slice(0, 20).map((session) => ({
      title: session.title ?? session.id,
      value: session.id,
      description: `${context.data.session.status(session.id)} · ${usd(context.data.session.cost(session.id))}`,
      category: session.parentID ? "child" : "root",
    })),
  })
  if (!picked) return
  setPreferences((draft) => {
    draft.lastPick = picked
  })

  const session = context.data.session.get(picked)
  const branch = context.data.location.vcs.info(context.location)?.branch.current
  const tokens = session?.tokens
  const summary = [
    `status ${context.data.session.status(picked)}`,
    session?.agent ?? "default agent",
    session?.model ? `${session.model.providerID}/${session.model.id}` : "no model",
    `${usd(context.data.session.cost(picked))}`,
    tokens ? `${compact(tokens.input + tokens.output)} tokens` : "no token usage",
    branch ? `git ${branch}` : "no git repository",
  ].join(" · ")

  await context.ui.dialog.alert({ title: session?.title ?? picked, message: summary })
}

function NotesDialog() {
  const context = usePlugin()
  const [notes, setNotes] = context.storage.memory(NOTES_KEY, {
    initial: { entries: [] as string[] },
  })

  // A custom dialog owns its input while it is open, exactly like a panel, so
  // its keys are registered from the component that renders it.
  context.keymap.layer(() => ({
    commands: [
      {
        id: "acme.dialog.notes.add",
        title: "Add note",
        bind: "ctrl+n",
        run: () => {
          const entry = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          setNotes((draft) => {
            draft.entries = [...draft.entries, entry]
          })
          context.ui.toast.show({ message: "Note added", variant: "success", duration: 1200 })
        },
      },
      {
        id: "acme.dialog.notes.clear",
        title: "Clear notes",
        bind: "ctrl+d",
        run: async () => {
          if (notes.entries.length === 0) return
          const confirmed = await context.ui.dialog.confirm({
            title: "Clear notes",
            message: `Remove all ${notes.entries.length} notes?`,
            label: { confirm: "Clear", cancel: "Keep" },
          })
          if (!confirmed) return
          setNotes((draft) => {
            draft.entries = []
          })
        },
      },
      {
        id: "acme.dialog.notes.close",
        title: "Close dialog",
        bind: "escape",
        run: () => {
          context.ui.dialog.clear()
        },
      },
    ],
  }))

  return (
    <box flexDirection="column" gap={1}>
      <text fg={context.theme.text.base}>Session notes</text>
      <Show
        when={notes.entries.length > 0}
        fallback={<text fg={context.theme.text.muted}>No notes yet. ctrl+n adds one.</text>}
      >
        <box flexDirection="column">
          <For each={notes.entries}>
            {(entry) => <text fg={context.theme.text.base}>{entry}</text>}
          </For>
        </box>
      </Show>
      <text fg={context.theme.text.muted}>ctrl+n add · ctrl+d clear · escape close</text>
    </box>
  )
}

function usd(value: number): string {
  return `$${value.toFixed(4)}`
}

function compact(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}k`
  return `${(value / 1_000_000).toFixed(1)}M`
}
