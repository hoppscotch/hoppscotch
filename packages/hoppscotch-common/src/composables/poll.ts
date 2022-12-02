import { onBeforeUnmount, Ref, shallowRef } from "vue"

export function usePolled<T>(
  pollDurationMS: number,
  pollFunc: (stopPolling: () => void) => T
): Ref<T> {
  let polling = true
  let handle: ReturnType<typeof setInterval> | undefined

  const stopPolling = () => {
    if (handle) {
      clearInterval(handle)
      handle = undefined
      polling = false
    }
  }

  const result = shallowRef(pollFunc(stopPolling))

  if (polling) {
    handle = setInterval(() => {
      result.value = pollFunc(stopPolling)
    }, pollDurationMS)
  }

  onBeforeUnmount(() => {
    if (polling) stopPolling()
  })

  return result
}
