import { HoppModule } from "~/types";
import { ref } from "vue";

import { registerSW } from "virtual:pwa-register";
import { getLocalConfig, setLocalConfig } from "~/newstore/localpersistence";

export type HoppPWARegistrationStatus =
  | { status: "NOT_INSTALLED" }
  | { status: "INSTALLED", registration: ServiceWorkerRegistration | undefined }
  | { status: "INSTALL_FAILED", error: any }

export const pwaNeedsRefresh = ref(false)
export const pwaInstalled = ref(false)
export const pwaReadyForOffline = ref(false)
export const pwaDefferedPrompt = ref<Event | null>(null)
export const pwaRegistered =
  ref<HoppPWARegistrationStatus>({
    status: "NOT_INSTALLED"
  })


let updateApp: (reloadPage?: boolean) => Promise<void> | undefined

export const refreshAppForPWAUpdate = async () => {
  await updateApp?.(true)
}

export const installPWA = async () => {
  if (pwaDefferedPrompt.value) {
    (pwaDefferedPrompt.value as any).prompt()
    const outcome: string = await (pwaDefferedPrompt.value as any).userChoice

    if (outcome === "accepted") {
      console.info("Hoppscotch was installed successfully.")
    } else {
      console.info(
        "Hoppscotch could not be installed. (Installation rejected by user.)"
      )
    }

    pwaDefferedPrompt.value = null
  }
}

// TODO: Update install prompt stuff

const pwaModule: HoppModule = () => {
  pwaInstalled.value = getLocalConfig("pwaInstalled") === "yes"

  if (!pwaInstalled.value && window.matchMedia("(display-mode: standalone)").matches) {
    setLocalConfig("pwaInstalled", "yes")
    pwaInstalled.value = true
  }

  if (!pwaInstalled.value && (window.navigator as any).standalone === true) {
    setLocalConfig("pwaInstalled", "yes")
    pwaInstalled.value = true
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    pwaDefferedPrompt.value = event
  })

  updateApp = registerSW({
    immediate: true,
    onNeedRefresh() {
      pwaNeedsRefresh.value = true
    },
    onOfflineReady() {
      pwaReadyForOffline.value = true
    },
    onRegistered(registration) {
      pwaRegistered.value = {
        status: "INSTALLED",
        registration
      }
    },
    onRegisterError(error) {
      pwaRegistered.value = {
        status: "INSTALL_FAILED",
        error
      }
    },
  })
}

export default pwaModule
