import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./platform/auth"

createHoppApp("#app", {
  auth: authDef,
})
