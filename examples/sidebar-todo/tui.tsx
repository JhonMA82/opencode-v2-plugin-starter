// Example: a task list in the left sidebar. Catalog: examples/README.md
// Context used: ui.slot(sidebar.content | sidebar.footer), data.session.message, data.session, keymap.layer, theme
//
// The host paints its own todo list. This is a plugin reading the same source of
// truth: the structured `input` of the `todowrite` tool call in the session's
// messages. That input is typed as a plain JsonValue record, so the example
// narrows it defensively on purpose: if the tool's schema changes, the panel
// degrades to "no list" instead of throwing inside a slot render.
//
// Unverified field names: `todos[].content/status/priority` come from the tool's
// own contract, not from the plugin types, and no session on this machine had
// called `todowrite` yet. Confirm them against a real call before relying on them.
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { TextAttributes } from "@opentui/core"
import { For, Show, createMemo } from "solid-js"

const ID = "acme.sidebar-todo"
const TOOL = "todowrite"

type Todo = { readonly content: string; readonly status: string; readonly priority: string }

const DEFAULTS: readonly Todo[] = []

export default Plugin.define({
  id: ID,
  setup(context) {
    // The sidebar slot hands us the session id, so nothing has to be looked up.
    context.ui.slot({
      append: "sidebar.content",
      render: (input) => <TodoList sessionID={input.sessionID} />,
    })

    // The footer gets the one number that matters at a glance.
    context.ui.slot({
      append: "sidebar.footer",
      render: (input) => <TodoProgress sessionID={input.sessionID} />,
    })

    context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          priority: 10,
          commands: [
            {
              id: `${ID}.progress`,
              title: "Todos: report progress",
              description: "Toast how many tasks are done in the current session",
              group: "Todos",
              palette: true,
              slash: { name: "todos" },
              run: () => {
                const route = context.ui.router.current()
                if (route.type !== "session") return
                const todos = readTodos(context, route.sessionID)
                if (todos.length === 0) {
                  context.ui.toast.show({ message: "No tasks in this session", variant: "info" })
                  return
                }
                const done = todos.filter((todo) => todo.status === "completed").length
                context.ui.toast.show({ message: `${done}/${todos.length} tasks done`, variant: "info" })
              },
            },
          ],
        }))
        return null
      },
    })
  },
})

function TodoList(props: { readonly sessionID: string }) {
  const context = usePlugin()
  const todos = createMemo(() => readTodos(context, props.sessionID))
  const done = createMemo(() => todos().filter((todo) => todo.status === "completed").length)

  return (
    <box flexDirection="column" gap={0}>
      <Show when={todos().length > 0}>
        <box flexDirection="row" gap={1}>
          <text attributes={TextAttributes.BOLD} fg={context.theme.text.base}>
            tasks
          </text>
          <text fg={context.theme.text.muted}>
            {done()}/{todos().length}
          </text>
        </box>
        <For each={todos()}>
          {(todo) => (
            <box flexDirection="row" gap={1}>
              <text fg={marker(context, todo.status)}>{markerFor(todo.status)}</text>
              <text fg={todo.status === "completed" ? context.theme.text.muted : context.theme.text.base}>
                {todo.content}
              </text>
            </box>
          )}
        </For>
      </Show>
    </box>
  )
}

function TodoProgress(props: { readonly sessionID: string }) {
  const context = usePlugin()
  const todos = createMemo(() => readTodos(context, props.sessionID))
  return (
    <Show when={todos().length > 0}>
      <text fg={context.theme.text.muted}>
        {todos().filter((todo) => todo.status === "completed").length}/{todos().length} done
      </text>
    </Show>
  )
}

/**
 * Reads the last `todowrite` call of the session, scoped the way the host scopes
 * it: only messages after the last compaction count, because a compaction
 * rewrites the history and older task state is no longer current.
 */
function readTodos(context: ReturnType<typeof usePlugin>, sessionID: string): readonly Todo[] {
  const messages = context.data.session.message.list(sessionID)
  const lastCompaction = messages.findLastIndex((message) => message.type === "compaction")
  const current = lastCompaction === -1 ? messages : messages.slice(lastCompaction + 1)

  let todos: readonly Todo[] = DEFAULTS
  for (const message of current) {
    if (message.type !== "assistant") continue
    for (const part of message.content) {
      if (part.type !== "tool" || part.name !== TOOL) continue
      const state = part.state
      if (state.status !== "completed") continue
      todos = narrowTodos(state.input)
    }
  }
  return todos
}

/** The tool's input is an untyped record: accept only what we understand. */
function narrowTodos(input: unknown): readonly Todo[] {
  if (typeof input !== "object" || input === null) return DEFAULTS
  const raw = (input as { todos?: unknown }).todos
  if (!Array.isArray(raw)) return DEFAULTS
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return []
    const value = item as { content?: unknown; status?: unknown; priority?: unknown }
    if (typeof value.content !== "string") return []
    return [
      {
        content: value.content,
        status: typeof value.status === "string" ? value.status : "pending",
        priority: typeof value.priority === "string" ? value.priority : "medium",
      },
    ]
  })
}

function markerFor(status: string): string {
  if (status === "completed") return "✓"
  if (status === "in_progress") return "•"
  return "○"
}

function marker(context: ReturnType<typeof usePlugin>, status: string) {
  if (status === "completed") return context.theme.text.feedback.success.base
  if (status === "in_progress") return context.theme.text.feedback.info.base
  return context.theme.text.muted
}
