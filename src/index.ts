import { Plugin } from "@opencode/plugin"
import { PLUGIN_ID } from "./constants"

export default Plugin.define({
  id: PLUGIN_ID,
  async setup(ctx) {
    await ctx.storage.set("starter.version", "0.1.0")
  },
})
