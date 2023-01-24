import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./firebase/auth"

createHoppApp("#app", {
  auth: authDef,
})
