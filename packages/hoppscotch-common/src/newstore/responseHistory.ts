import { ref } from "vue"
import { executedResponses$ } from "~/helpers/RequestRunner"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

export interface CachedResponseRecord {
  id: string
  timestamp: Date
  method: string
  endpoint: string
  statusCode: number
  duration: number
  size: number
  response: HoppRESTResponse
}

export const cachedResponsesList = ref<CachedResponseRecord[]>([])

// Auto-cache executed responses during the session
executedResponses$.subscribe((res) => {
  if (
    res &&
    (res.type === "success" || res.type === "fail")
  ) {
    cachedResponsesList.value.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      method: res.req.method || "GET",
      endpoint: res.req.endpoint || "/",
      statusCode: res.statusCode,
      duration: res.meta.responseDuration,
      size: res.meta.responseSize,
      response: res,
    })

    // Keep last 30 executed responses in cache
    if (cachedResponsesList.value.length > 30) {
      cachedResponsesList.value.pop()
    }
  }
})
