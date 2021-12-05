import { Ref } from "@nuxtjs/composition-api"

export default function useDownloadResponse(
  responseBodyText: Ref<any>,
  downloadIcon: Ref<any>,
  toast: any,
  t: any
): { [key: string]: () => void } {
  const downloadResponse = () => {
    const dataToWrite = responseBodyText.value
    const file = new Blob([dataToWrite], { type: "text/html" })
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
    downloadResponse,
  }
}
