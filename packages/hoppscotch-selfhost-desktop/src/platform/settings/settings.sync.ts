import { settingsStore } from "@hoppscotch/common/newstore/settings"

import { getSyncInitFunction } from "../../lib/sync"

import { StoreSyncDefinitionOf } from "../../lib/sync"

import { updateUserSettings } from "./settings.api"

export const settingsSyncDefinition: StoreSyncDefinitionOf<
  typeof settingsStore
> = {
  applySetting() {
    updateUserSettings(JSON.stringify(settingsStore.value))
  },
}

export const settingsSyncer = getSyncInitFunction(
  settingsStore,
  settingsSyncDefinition,
  () => true
)
