import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./firebase/auth"
import { def as envDef } from "./environments"
import { def as collectionsDef } from "./collections"

createHoppApp("#app", {
  auth: authDef,
  sync: {
    environments: envDef,
    collections: collectionsDef,
  },
})
