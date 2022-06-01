import { Ref } from "@nuxtjs/composition-api"
import { refAutoReset } from "@vueuse/core"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n, useToast } from "~/helpers/utils/composables"

export default function useCopyResponse(responseBodyText: Ref<any>): {
  copyIcon: Ref<string>
  copyResponse: () => void
} {
  const toast = useToast()
  const t = useI18n()

  const copyIcon = refAutoReset<"copy" | "check">("copy", 1000)

  const copyResponse = () => {
    copyToClipboard(responseBodyText.value)
    copyIcon.value = "check"
    toast.success(`${t("state.copied_to_clipboard")}`)
  }

  return {
    copyIcon,
    copyResponse,
  }
}
