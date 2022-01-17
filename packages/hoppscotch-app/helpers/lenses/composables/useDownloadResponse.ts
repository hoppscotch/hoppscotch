import { Ref, ref } from "@nuxtjs/composition-api"
import { useI18n, useToast } from "~/helpers/utils/composables"

export type downloadResponseReturnType = (() => void) | Ref<any>

export default function useDownloadResponse(
  contentType: string,
  responseBodyText: Ref<string>
): {
  downloadIcon: Ref<string>
  downloadResponse: () => void
} {
  const downloadIcon = ref("download")
  const toast = useToast()
  const t = useI18n()

  const downloadResponse = () => {
    const dataToWrite = responseBodyText.value
    const file = new Blob([dataToWrite], { type: contentType })
    const a = document.createElement("a")
    const url = URL.createObjectURL(file)
    a.href = url
    // TODO get uri from meta
    a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
    document.body.appendChild(a)
    a.click()
    downloadIcon.value = "check"
    toast.success(`${t("state.download_started")}`)
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      downloadIcon.value = "download"
    }, 1000)
  }
  return {
    downloadIcon,
    downloadResponse,
  }
}
