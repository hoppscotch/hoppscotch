import * as E from "fp-ts/Either"
import { runGQLSubscription } from "~/helpers/backend/GQLClient"
import { bulkApplySettings, getDefaultSettings } from "~/newstore/settings"
import { platform } from "~/platform"
import { SettingsPlatformDef } from "~/platform/settings"
import { runDispatchWithOutSyncing } from ".."
import {
  createUserSettings,
  getUserSettings,
  runUserSettingsUpdatedSubscription,
} from "./api"
import { settingsSyncer } from "./sync"

function initSettingsSync() {
  const authEvents$ = platform.auth.getAuthEventsStream()
  const currentUser$ = platform.auth.getCurrentUserStream()
  settingsSyncer.startStoreSync()
  settingsSyncer.setupSubscriptions(setupSubscriptions)

  currentUser$.subscribe(async (user) => {
    if (user) {
      // load the settings
      loadUserSettings()
    }
  })

  authEvents$.subscribe((event) => {
    if (event.event == "login" || event.event == "token_refresh") {
      settingsSyncer.startListeningToSubscriptions()
    }

    if (event.event == "logout") {
      settingsSyncer.stopListeningToSubscriptions()
    }
  })
}

async function loadUserSettings() {
  const res = await getUserSettings()

  // create user settings if it doesn't exist
  if (E.isLeft(res) && res.left.error == "user_settings/not_found") {
    const createRes = await createUserSettings(
      JSON.stringify(getDefaultSettings())
    )

    if (E.isRight(createRes)) {
      runDispatchWithOutSyncing(() => {
        bulkApplySettings(
          JSON.parse(createRes.right.createUserSettings.properties)
        )
      })
    }
  } else if (E.isRight(res)) {
    runDispatchWithOutSyncing(() => {
      bulkApplySettings(JSON.parse(res.right.me.settings.properties))
    })
  }
}

function setupSubscriptions() {
  let subs: ReturnType<typeof runGQLSubscription>[1][] = []

  const userSettingsUpdatedSub = setupUserSettingsUpdatedSubscription()

  subs = [userSettingsUpdatedSub]

  return () => {
    subs.forEach((sub) => sub.unsubscribe())
  }
}

function setupUserSettingsUpdatedSubscription() {
  const [userSettingsUpdated$, userSettingsUpdatedSub] =
    runUserSettingsUpdatedSubscription()

  userSettingsUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      runDispatchWithOutSyncing(() => {
        bulkApplySettings(JSON.parse(res.right.userSettingsUpdated.properties))
      })
    }
  })

  return userSettingsUpdatedSub
}

export const def: SettingsPlatformDef = {
  initSettingsSync,
}
