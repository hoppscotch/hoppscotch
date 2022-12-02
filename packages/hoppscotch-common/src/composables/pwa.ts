import { watch } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { pwaNeedsRefresh, refreshAppForPWAUpdate } from "@modules/pwa"

export const usePwaPrompt = function () {
  const toast = useToast()
  const t = useI18n()

  watch(
    pwaNeedsRefresh,
    (value) => {
      if (value) {
        toast.show(`${t("app.new_version_found")}`, {
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
    },
    {
      immediate: true,
    }
  )
}
