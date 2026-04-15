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
import { NativeKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/native"
import { parseBodyAsJSON } from "@hoppscotch/common/helpers/functional/json"

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
      if (user.accessToken) {
        loadProxyConfig(user.accessToken)
      }
    }
  })

  authEvents$.subscribe((event) => {
    if (event.event == "login" || event.event == "token_refresh") {
      settingsSyncer.startListeningToSubscriptions()
    }

    if (event.event == "logout") {
      settingsSyncer.stopListeningToSubscriptions()
      const proxyStore = getService(KernelInterceptorProxyStore)
      proxyStore.resetSettings().catch(() => {})
    }
  })
}

async function loadProxyConfig(accessToken: string) {
  try {
    if (!accessToken) return

    const interceptorService = getService(NativeKernelInterceptorService)
    const { response } = interceptorService.execute({
      id: Date.now(),
      url: `${import.meta.env.VITE_BACKEND_API_URL}/site/proxy-config`,
      method: "GET",
      version: "HTTP/1.1",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const responseResult = await response

    if (E.isLeft(responseResult)) {
      console.warn("[proxy-config] Native request failed:", responseResult.left)
      return
    }

    if (responseResult.right.status !== 200) {
      console.warn(
        "[proxy-config] Unexpected response status while loading proxy config:",
        responseResult.right.status
      )
      return
    }

    const parsed = parseBodyAsJSON<{
      proxyUrl?: string | null
      accessToken: string
    }>(responseResult.right.body)

    if (parsed._tag !== "Some") {
      console.warn("[proxy-config] Failed to parse response body")
      return
    }

    const { proxyUrl, accessToken: proxyToken } = parsed.value

    if (typeof proxyToken !== "string" || !proxyToken) {
      console.warn("[proxy-config] Invalid or missing accessToken in response")
      return
    }

    const proxyStore = getService(KernelInterceptorProxyStore)

    const updatedSettings: { proxyUrl?: string; accessToken: string } = {
      accessToken: proxyToken,
    }

    if (proxyUrl !== undefined && proxyUrl !== null) {
      updatedSettings.proxyUrl = proxyUrl
    }

    await proxyStore.updateSettings(updatedSettings)
  } catch (err) {
    console.debug("[proxy-config] Error loading proxy config:", err)
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
