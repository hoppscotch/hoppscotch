import { computed, Ref } from "@nuxtjs/composition-api"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

export default function useResponseBody(response: HoppRESTResponse): {
  [key: string]: Ref<any>
} {
  const responseBodyText = computed(() => {
    if (response.type === "loading" || response.type === "network_fail")
      return ""
    if (typeof response.body === "string") return response.body
    else {
      const res = new TextDecoder("utf-8").decode(response.body)
      // HACK: Temporary trailing null character issue from the extension fix
      return res.replace(/\0+$/, "")
    }
  })
  return {
    responseBodyText,
  }
}
