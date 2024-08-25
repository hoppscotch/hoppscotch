import "./style.css"
import Move from "./components/learn/Move.vue"
import { createHoppAdminApp } from "@hoppscotch/sh-admin/main"
import { PluginsDef } from "@hoppscotch/sh-admin/plugins"
import { REGISTERED_COMPONENTS } from "@hoppscotch/sh-admin/helpers/components"
import Move2 from "./components/learn/Move2.vue"

const registeredComponents: PluginsDef = {
  components: [
    { name: REGISTERED_COMPONENTS.HoppButton, components: [Move2] },
    {
      name: REGISTERED_COMPONENTS.Configurations,
      components: [Move, Move2],
    },
  ],
}

createHoppAdminApp("#app", registeredComponents)
