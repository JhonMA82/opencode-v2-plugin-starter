import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = path.resolve(import.meta.dirname, "..")
const executableRoots = ["src", "tests", "examples"]
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".jsonc"])

const forbidden = [
  { re: /@opencode-ai\/plugin(?:\/|["'])/, reason: "transitional/legacy @opencode-ai/plugin import" },
  { re: /@opencode-ai\/sdk(?:\/|["'])/, reason: "legacy/transitional @opencode-ai/sdk import" },
  { re: /["']plugin["']\s*:/, reason: "singular OpenCode 1 config key; use plugins" },
  { re: /\bapi\.command\b/, reason: "legacy TUI api.command compatibility API" },
  { re: /export\s+default\s*\{[\s\S]*?\bserver\s*:/m, reason: "legacy combined { server, ... } plugin shape" },
  { re: /export\s+default\s*\{[\s\S]*?\btui\s*:/m, reason: "legacy combined { ..., tui } plugin shape" },
]

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return textExtensions.has(path.extname(entry.name)) ? [full] : []
  })
}

const files = executableRoots.flatMap((item) => walk(path.join(root, item)))
files.push(path.join(root, "package.json"))

const failures = []
for (const file of files) {
  const text = fs.readFileSync(file, "utf8")
  for (const rule of forbidden) {
    if (rule.re.test(text)) {
      failures.push(`${path.relative(root, file)}: ${rule.reason}`)
    }
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
if (!pkg.dependencies?.["@opencode/plugin"]) failures.push("package.json: missing @opencode/plugin dependency")
if (pkg.exports?.["."] !== "./src/index.ts") failures.push("package.json: expected native server export at ./src/index.ts")
if (pkg.exports?.["./tui"] !== "./src/tui.tsx") failures.push("package.json: expected native TUI export at ./src/tui.tsx")

const server = fs.readFileSync(path.join(root, "src/index.ts"), "utf8")
const tui = fs.readFileSync(path.join(root, "src/tui.tsx"), "utf8")
if (!server.includes('from "@opencode/plugin"')) failures.push("src/index.ts: server entrypoint must import @opencode/plugin")
if (!tui.includes('from "@opencode/plugin/tui"')) failures.push("src/tui.tsx: TUI entrypoint must import @opencode/plugin/tui")
if (!server.includes("Plugin.define(")) failures.push("src/index.ts: expected Plugin.define(...) native entrypoint")
if (!tui.includes("Plugin.define(")) failures.push("src/tui.tsx: expected Plugin.define(...) native entrypoint")

if (failures.length) {
  console.error("OpenCode 2 native compatibility check failed:\n")
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`OpenCode 2 native compatibility check passed (${files.length} files scanned).`)
