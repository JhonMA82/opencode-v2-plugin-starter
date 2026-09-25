// Example: server-side transforms, a tool, a command and a hook. Catalog: examples/README.md
// Context used: tool.transform, agent.transform, command.transform, tool.hook, session.prompt, storage
//
// A transform callback is synchronous, cheap, deterministic and repeatable. Do the I/O in the tool or the hook,
// never inside a transform, and dispose every registration when the plugin goes away.
import { Plugin } from "@opencode/plugin"

const ID = "acme.transforms"
const TOOL = "acme_word_count"
const COMMAND = "acme-measure"
const DESCRIPTION_NOTE = "Adjusted by the acme.transforms plugin."
const SYSTEM_NOTE = "When asked to measure text, use the acme_word_count tool."

export default Plugin.define({
  id: ID,
  async setup(ctx) {
    // 1. A tool the model can call. `Tool.ValueSchema` accepts a plain JSON Schema,
    //    so a plugin needs no schema library of its own.
    const tools = await ctx.tool.transform((editor) => {
      editor.add({
        name: TOOL,
        description: "Count the words of a string and return the number.",
        input: {
          type: "object",
          properties: { text: { type: "string", description: "text to measure" } },
          required: ["text"],
        },
        async execute(input) {
          // A JSON Schema input arrives as `unknown`, so read it defensively.
          const text = readText(input)
          const words = text.trim() ? text.trim().split(/\s+/).length : 0
          return { output: { words }, content: `The text has ${words} words.` }
        },
      })
    })

    // 2. Annotate the primary agents. The callback stays synchronous and
    //    idempotent: a second pass must not append the note twice.
    const agents = await ctx.agent.transform((editor) => {
      for (const agent of editor.list()) {
        if (agent.mode !== "primary") continue
        // Agent ids are branded strings; the editor wants plain ones.
        editor.update(String(agent.id), (draft) => {
          if (draft.description?.includes(DESCRIPTION_NOTE)) return
          draft.description = [draft.description, DESCRIPTION_NOTE].filter(Boolean).join("\n\n")
          // `system` is a branded string, so widen it before joining.
          draft.system = [String(draft.system ?? ""), SYSTEM_NOTE].filter(Boolean).join("\n\n")
        })
      }
    })

    // 3. A command, which the host exposes to the user like any other command.
    const commands = await ctx.command.transform((editor) => {
      editor.add({
        name: COMMAND,
        description: "Ask the current session to measure a phrase with the word count tool",
        async execute(invocation) {
          await ctx.session.prompt({
            sessionID: invocation.sessionID,
            text: `Count the words of: ${invocation.prompt?.text ?? "hello world"}`,
          })
        },
      })
    })

    // 4. A hook observes every tool call without changing its behaviour. Hooks
    //    may do I/O; transforms may not.
    const hook = await ctx.tool.hook("execute.before", (input) => {
      console.error(`[${ID}] ${input.tool} · session ${input.sessionID} · agent ${input.agent}`)
    })

    // Every transform and hook is a registration. Disposing them is what makes
    // the plugin removable at runtime instead of only on restart.
    return async () => {
      await Promise.all([tools.dispose(), agents.dispose(), commands.dispose(), hook.dispose()])
    }
  },
})

function readText(input: unknown): string {
  if (typeof input !== "object" || input === null) return ""
  const value = (input as { text?: unknown }).text
  return typeof value === "string" ? value : ""
}
