import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { pwaNeedsRefresh, refreshAppForPWAUpdate } from "@modules/pwa"
import { watch } from "vue"

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
      position: "bottom-center",
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
