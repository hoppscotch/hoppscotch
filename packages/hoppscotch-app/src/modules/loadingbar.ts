import { HoppModule } from "."
import NProgress from "nprogress"

let deferedProgressHandle: ReturnType<typeof setTimeout> | null = null

/**
 * Starts animating the global progress bar
 * @param deferTime How much time to defer the global progress bar rendering to
 */
export const startPageProgress = (deferTime?: number) => {
  if (deferedProgressHandle) clearTimeout(deferedProgressHandle)

  // If deferTime is specified, queue it
  if (deferTime !== undefined) {
    deferedProgressHandle = setTimeout(() => {
      NProgress.start()
    }, deferTime)

    return
  }

  NProgress.start()
}

export const completePageProgress = () => {
  if (deferedProgressHandle) {
    clearTimeout(deferedProgressHandle)
    deferedProgressHandle = null
  }

  NProgress.done()
}

export const removePageProgress = () => {
  if (deferedProgressHandle) {
    clearTimeout(deferedProgressHandle)
    deferedProgressHandle = null
  }

  NProgress.remove()
}

export default <HoppModule>{
  onVueAppInit() {
    NProgress.configure({ showSpinner: false })
  },
  onBeforeRouteChange(to, from) {
    // Show progressbar on page change
    if (to.path !== from.path) {
      startPageProgress(500)
    }
  },
  onAfterRouteChange() {
    completePageProgress()
  },
}
