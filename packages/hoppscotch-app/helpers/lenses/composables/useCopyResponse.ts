import { Ref, ref } from "@nuxtjs/composition-api"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n, useToast } from "~/helpers/utils/composables"

export default function useCopyResponse(responseBodyText: Ref<any>): {
  copyIcon: Ref<string>
  copyResponse: () => void
} {
  const toast = useToast()
  const t = useI18n()
  const copyIcon = ref("copy")

  const copyResponse = () => {
    copyToClipboard(responseBodyText.value)
    copyIcon.value = "check"
    toast.success(`${t("state.copied_to_clipboard")}`)
    setTimeout(() => (copyIcon.value = "copy"), 1000)
  }

  return {
    copyIcon,
    copyResponse,
  }
}
