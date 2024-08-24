import "./style.css"
import Move from "./components/learn/Move.vue"
import { createHoppAdminApp } from "@hoppscotch/sh-admin/main"
import { PluginsDef } from "@hoppscotch/sh-admin/plugins"

const registeredComponents: PluginsDef = {
  components: [{ name: "HoppButton", component: Move }],
}

createHoppAdminApp("#app", registeredComponents)
