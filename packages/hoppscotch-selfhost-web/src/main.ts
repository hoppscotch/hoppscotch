import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./platform/auth"
import { def as environmentsDef } from "./platform/environments/environments.platform"
import { def as collectionsDef } from "./platform/collections/collections.platform"

createHoppApp("#app", {
  auth: authDef,
  sync: {
    environments: environmentsDef,
    collections: collectionsDef,
  },
})
