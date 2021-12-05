import { Ref, ref } from "@nuxtjs/composition-api"
import { copyToClipboard } from "~/helpers/utils/clipboard"

export default function useCopyResponse(
  responseBodyText: Ref<any>,
  toast: any,
  t: any
): { [key: string]: (() => void) | Ref<any> } {
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
