import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./platform/auth"
import { def as environmentsDef } from "./platform/environments/environments.platform"

createHoppApp("#app", {
  auth: authDef,
  sync: {
    environments: environmentsDef,
  },
})
