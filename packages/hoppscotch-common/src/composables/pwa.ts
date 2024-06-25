import { markRaw, watch } from "vue"
import { useToast } from "@composables/toast"
import { toast as sonner } from "@hoppscotch/ui"
import { useI18n } from "@composables/i18n"
import { pwaNeedsRefresh, refreshAppForPWAUpdate } from "@modules/pwa"
import { getService } from "~/modules/dioc"
import { PersistenceService } from "~/services/persistence"
import { version } from "./../../package.json"
import PWAPrompt from "~/components/app/PWAPrompt.vue"

export const usePwaPrompt = function () {
  const toast = useToast()
  const t = useI18n()

  watch(
    pwaNeedsRefresh,
    (value) => {
      if (value) {
        showUpdateToast()
      }
    },
    {
      immediate: true,
    }
  )

  function showUpdateToast() {
    toast.show(`${t("app.new_version_found")}`, {
      position: "bottom-left",
      duration: 0,
      action: [
        {
          text: `${t("action.dismiss")}`,
          onClick: (_, toastObject) => {
            toastObject.goAway(0)
          },
        },
        {
          text: `${t("app.reload")}`,
          onClick: (_, toastObject) => {
            toastObject.goAway(0)
            refreshAppForPWAUpdate()
          },
        },
      ],
    })
  }
}

export const useWhatsNewPrompt = async function () {
  const persistenceService = getService(PersistenceService)

  const oldVersion = persistenceService.getLocalConfig("hopp_v")
  const latestMajorVersion = version.split(".").slice(0, 2).join(".")

  if (oldVersion === version) return

  // Skipping the minor version update. e.g. 2024.1.0 -> 2024.1.1
  // Checking major version update. e.g. 2024.1 -> 2024.2

  const isUpdatedToLatestMajorVersion =
    oldVersion?.split(".").slice(0, 2).join(".") === latestMajorVersion

  if (isUpdatedToLatestMajorVersion) {
    const notesUrl = await getReleaseNotes(latestMajorVersion)
    if (notesUrl) {
      sonner.custom(markRaw(PWAPrompt), {
        componentProps: {
          notesUrl,
        },
      })
    }
  }

  persistenceService.setLocalConfig("hopp_v", version)
}

async function getReleaseNotes(v: string) {
  const res = await fetch(`https://releases.hoppscotch.com/releases/${v}.json`)
  const { release_notes } = await res.json()
  return release_notes
}
