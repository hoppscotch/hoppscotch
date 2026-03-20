import { SettingsPlatformDef } from "@hoppscotch/common/platform/settings"
import { settingsSyncer } from "./sync"
import { authEvents$, def as platformAuth } from "@app/platform/auth/desktop"
import {
  createUserSettings,
  getUserSettings,
  runUserSettingsUpdatedSubscription,
} from "./api"
import * as E from "fp-ts/Either"
import { runGQLSubscription } from "@hoppscotch/common/helpers/backend/GQLClient"
import {
  bulkApplySettings,
  getDefaultSettings,
} from "@hoppscotch/common/newstore/settings"
import { runDispatchWithOutSyncing } from "@app/lib/sync"
import { getService } from "@hoppscotch/common/modules/dioc"
import { KernelInterceptorProxyStore } from "@hoppscotch/common/platform/std/kernel-interceptors/proxy/store"
import { PersistenceService } from "@hoppscotch/common/services/persistence"
import axios from "axios"

function initSettingsSync() {
  const currentUser$ = platformAuth.getCurrentUserStream()
  settingsSyncer.startStoreSync()
  settingsSyncer.setupSubscriptions(setupSubscriptions)

  // load the settings

  loadUserSettings()

  currentUser$.subscribe(async (user) => {
    if (user) {
      // load the settings
      loadUserSettings()
      loadProxyConfig()
    }
  })

  authEvents$.subscribe((event) => {
    if (event.event == "login" || event.event == "token_refresh") {
      settingsSyncer.startListeningToSubscriptions()
    }

    if (event.event == "logout") {
      settingsSyncer.stopListeningToSubscriptions()
      const proxyStore = getService(KernelInterceptorProxyStore)
      proxyStore.resetSettings()
    }
  })
}

async function loadProxyConfig() {
  try {
    const persistence = getService(PersistenceService)
    const accessToken = await persistence.getLocalConfig("access_token")
    if (!accessToken) return

    const res = await axios.get<{ proxyUrl: string; accessToken: string }>(
      `${import.meta.env.VITE_BACKEND_API_URL}/site/proxy-config`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const { proxyUrl, accessToken: proxyToken } = res.data
    const proxyStore = getService(KernelInterceptorProxyStore)
    await proxyStore.updateSettings({
      ...(proxyUrl && { proxyUrl }),
      accessToken: proxyToken,
    })
  } catch {
    // Proxy config is optional — silently ignore if endpoint is unavailable
  }
}

async function loadUserSettings() {
  const res = await getUserSettings()

  // create user settings if it doesn't exist
  E.isLeft(res) &&
    res.left.error == "user_settings/not_found" &&
    (await createUserSettings(JSON.stringify(getDefaultSettings())))

  if (E.isRight(res)) {
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
