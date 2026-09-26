// Example: a custom fenced code block renderer. Catalog: examples/README.md
// Context used: markdown.registerCodeBlockRenderer, renderer, theme
//
// The host owns the markdown pipeline; a plugin only swaps the rendering of one
// fence language. Returning `undefined` falls back to the host's own rendering,
// so take over only for content you actually understand.
//
// Verified on a real 2.0.16 host: a fence in MODEL output is dispatched here and
// the card renders. One real limit, recorded in docs/V2-COMPATIBILITY.md: a fence
// typed by the user is rendered by a code renderable that never receives the
// plugin renderNode, so only the assistant path reaches this callback.
// Returning `undefined` falls back to the host's own rendering, so take over only
// for content you actually understand, and never rely on this for user input.
import { Plugin } from "@opencode/plugin/tui"
import { BoxRenderable, TextRenderable } from "@opentui/core"

const ID = "acme.markdown"
const FENCE = "acme-todo"

export default Plugin.define({
  id: ID,
  setup(context) {
    // The renderer builds OpenTUI renderables on the host's own renderer, so
    // there is no second terminal renderer and no extra runtime bundled.
    const unregister = context.markdown.registerCodeBlockRenderer(FENCE, (token, node) => {
      const items = parse(token.text)
      // Unknown content stays untouched. `node.defaultRender()` is the host's
      // own rendering if a plugin ever wants to decorate instead of replace.
      if (items.length === 0) return undefined

      const card = new BoxRenderable(context.renderer, {
        flexDirection: "column",
        border: true,
        borderStyle: "rounded",
        borderColor: context.theme.border.base,
        backgroundColor: context.theme.background.raised.base,
        paddingX: 1,
        marginBottom: 1,
        title: FENCE,
        titleColor: context.theme.text.muted,
      })

      for (const item of items) {
        card.add(
          new TextRenderable(context.renderer, {
            content: item.done ? `✓ ${item.label}` : `· ${item.label}`,
            fg: item.done ? context.theme.text.muted : context.theme.text.base,
          }),
        )
      }
      return card
    })

    return unregister
  },
})

type Item = { readonly label: string; readonly done: boolean }

/** Accepts `- [ ] label` and `- [x] label`; anything else is not ours. */
function parse(source: string): Item[] {
  const items: Item[] = []
  for (const line of source.split("\n")) {
    const match = /^\s*-\s*\[( |x|X)\]\s*(.+)$/.exec(line)
    if (!match) continue
    items.push({ done: match[1].toLowerCase() === "x", label: match[2].trim() })
  }
  return items
}
