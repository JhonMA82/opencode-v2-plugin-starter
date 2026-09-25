import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import serverPlugin from "../src/index"
import tuiPlugin from "../src/tui"
import sessionInfoPlugin from "../examples/session-info/tui"
import statusBarPlugin from "../examples/status-bar/tui"
import dialogPlugin from "../examples/dialog/tui"
import settingPlugin from "../examples/setting/tui"
import dashboardPlugin from "../examples/dashboard/tui"
import notifyPlugin from "../examples/notify/tui"
import markdownPlugin from "../examples/markdown/tui"
import slotsPlugin from "../examples/slots/tui"
import sidebarTodoPlugin from "../examples/sidebar-todo/tui"
import transformsPlugin from "../examples/transforms/index"

/**
 * Every example is one directory with a manifest. `tui` is optional: a server
 * example exports only `.`, and the catalog says which surface it proves.
 */
const EXAMPLES: Record<string, { plugin: { id: string; setup: unknown }; entry: string }> = {
  "session-info": { plugin: sessionInfoPlugin, entry: "tui.tsx" },
  "status-bar": { plugin: statusBarPlugin, entry: "tui.tsx" },
  dialog: { plugin: dialogPlugin, entry: "tui.tsx" },
  setting: { plugin: settingPlugin, entry: "tui.tsx" },
  dashboard: { plugin: dashboardPlugin, entry: "tui.tsx" },
  notify: { plugin: notifyPlugin, entry: "tui.tsx" },
  markdown: { plugin: markdownPlugin, entry: "tui.tsx" },
  slots: { plugin: slotsPlugin, entry: "tui.tsx" },
  "sidebar-todo": { plugin: sidebarTodoPlugin, entry: "tui.tsx" },
  transforms: { plugin: transformsPlugin, entry: "index.ts" },
}

/**
 * Slash names the host already owns, so an example cannot shadow one. Verified
 * against the host binary: each name here appears as a standalone string in
 * `opencode`. `dashboard` does not, which is why the example may use it.
 */
const HOST_SLASH_NAMES = [
  "settings",
  "init",
  "help",
  "compact",
  "share",
  "model",
  "agent",
  "session",
  "theme",
  "export",
  "editor",
  "connect",
  "logout",
]

function readExample(name: string, file?: string): string {
  const target = file ?? EXAMPLES[name].entry
  return readFileSync(new URL(`../examples/${name}/${target}`, import.meta.url), "utf8")
}

function manifest(name: string): Record<string, any> {
  return JSON.parse(readFileSync(new URL(`../examples/${name}/package.json`, import.meta.url), "utf8"))
}

describe("native OpenCode 2 entrypoint contracts", () => {
  test("server plugin exposes id + setup", () => {
    expect(typeof serverPlugin.id).toBe("string")
    expect(typeof serverPlugin.setup).toBe("function")
    expect("server" in serverPlugin).toBe(false)
    expect("tui" in serverPlugin).toBe(false)
  })

  test("TUI plugin exposes id + setup", () => {
    expect(typeof tuiPlugin.id).toBe("string")
    expect(typeof tuiPlugin.setup).toBe("function")
    expect("server" in tuiPlugin).toBe(false)
    expect("tui" in tuiPlugin).toBe(false)
  })

  for (const [name, example] of Object.entries(EXAMPLES)) {
    test(`${name} example exposes id + setup`, () => {
      expect(typeof example.plugin.id).toBe("string")
      expect(typeof example.plugin.setup).toBe("function")
      expect("server" in example.plugin).toBe(false)
      expect("tui" in example.plugin).toBe(false)
    })
  }
})

describe("example catalog invariants", () => {
  test("every example id is unique and plugin prefixed", () => {
    const ids = Object.values(EXAMPLES).map((example) => example.plugin.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id.startsWith("acme.")).toBe(true)
  })

  test("slash command names are unique and never take a host name", () => {
    // Slash and panel names are shared selection values: the host already owns
    // its own, so two claims on one name is a real collision, not cosmetic.
    const names = Object.keys(EXAMPLES)
      .flatMap((name) => [...readExample(name).matchAll(/slash:\s*\{\s*name:\s*"([^"]+)"/g)].map((m) => m[1]!))
    expect(new Set(names).size).toBe(names.length)
    for (const slash of names) expect(HOST_SLASH_NAMES).not.toContain(slash)
  })

  test("panel names are unique and plugin prefixed", () => {
    const panels = Object.keys(EXAMPLES)
      .flatMap((name) => [...readExample(name).matchAll(/["'`](\w[\w.-]*\.[\w.]*\.panel)["'`]/g)].map((m) => m[1]!))
    expect(new Set(panels).size).toBe(panels.length)
    for (const panel of panels) expect(panel.startsWith("acme.")).toBe(true)
  })

  test("no example reaches for a module-level mutable singleton", () => {
    // The examples exist to be modified by editing `context.*` reads only.
    // Module scope is unindented, so anchoring at column 0 spares the local
    // `let` an ordinary function is allowed to reassign.
    for (const name of Object.keys(EXAMPLES)) {
      const text = readExample(name)
      expect(text).not.toMatch(/^(let|var)\s+\w+/m)
      expect(text).not.toMatch(/globalThis\./)
    }
  })

  test("every example pins the same @opencode/plugin version as the starter", () => {
    const starter = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
    const pinned = starter.dependencies["@opencode/plugin"]
    for (const name of Object.keys(EXAMPLES)) {
      // A pin behind the running host typechecks green and throws at render time.
      expect(manifest(name).dependencies["@opencode/plugin"]).toBe(pinned)
    }
  })

  test("each manifest exports exactly the entrypoints the example has", () => {
    for (const [name, example] of Object.entries(EXAMPLES)) {
      const exportsField = manifest(name).exports
      const expected = example.entry === "tui.tsx" ? { "./tui": "./tui.tsx" } : { ".": "./index.ts" }
      expect(exportsField).toEqual(expected)
      expect(existsSync(new URL(`../examples/${name}/${example.entry}`, import.meta.url).pathname)).toBe(true)
    }
  })

  test("the catalog documents every example", () => {
    const catalog = readFileSync(new URL("../examples/README.md", import.meta.url), "utf8")
    for (const [name, example] of Object.entries(EXAMPLES)) {
      expect(catalog).toContain(`\`${name}/${example.entry}\``)
    }
  })
})
