import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./platform/auth"
import { def as environmentsDef } from "./platform/environments/environments.platform"
import { def as collectionsDef } from "./platform/collections/collections.platform"
import { def as settingsDef } from "./platform/settings/settings.platform"
import { def as historyDef } from "./platform/history/history.platform"
import { def as tabStateDef } from "./platform/tabState/tabState.platform"

createHoppApp("#app", {
  auth: authDef,
  sync: {
    environments: environmentsDef,
    collections: collectionsDef,
    settings: settingsDef,
    history: historyDef,
    tabState: tabStateDef,
  },
})
