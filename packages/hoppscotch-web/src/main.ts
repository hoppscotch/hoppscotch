import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./firebase/auth"
import { def as envDef } from "./environments"
import { def as collectionsDef } from "./collections"
import { def as settingsDef } from "./settings"
import { def as historyDef } from "./history"
import { def as tabStateDef } from "./tab"
import { def as analyticsDef } from "./analytics"

createHoppApp("#app", {
  auth: authDef,
  analytics: analyticsDef,
  sync: {
    environments: envDef,
    collections: collectionsDef,
    settings: settingsDef,
    history: historyDef,
    tabState: tabStateDef,
  },
})
