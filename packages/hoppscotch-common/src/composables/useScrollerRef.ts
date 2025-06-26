import { ref, onMounted, onBeforeUnmount, defineExpose } from "vue"
import { globalScrollMap } from "./scrollStore"
// This composable provides a way to manage a scrollable container reference
// and its scroll position, allowing for persistence across component lifecycles. 
export function useScrollerRef(
  label: string = "Lens",
  classSelector: string = ".cm-scroller",
  initialScrollTop?: number,
  scrollKey?: string
) {
  const containerRef = ref<HTMLElement | null>(null)
  const scrollerRef = ref<HTMLElement | null>(null)

  function waitUntilScrollable(maxTries = 60, delay = 16): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      let tries = 0

      const tryFind = () => {
        const scroller = containerRef.value?.querySelector(classSelector) as HTMLElement | null

        if (scroller && scroller.scrollHeight > scroller.clientHeight) {
          resolve(scroller)
          return
        }

        tries++
        if (tries >= maxTries) {
          reject(new Error(`[${label}] Timeout: ${classSelector} never scrollable`))
        } else {
          setTimeout(tryFind, delay)
        }
      }

      tryFind()
    })
  }

  let onScroll: (() => void) | null = null

  onMounted(() => {
    waitUntilScrollable()
      .then((scroller) => {
        scrollerRef.value = scroller

        requestAnimationFrame(() => {
          if (scrollKey && globalScrollMap.has(scrollKey)) {
            scroller.scrollTop = globalScrollMap.get(scrollKey)!
          } else if (initialScrollTop !== undefined) {
            scroller.scrollTop = initialScrollTop
          }
        })

        onScroll = () => {
          if (scrollKey) {
            globalScrollMap.set(scrollKey, scroller.scrollTop)
          }
        }

        scroller.addEventListener("scroll", onScroll)
      })
      .catch(() => {
        // Silently fail
      })
  })

  onBeforeUnmount(() => {
    if (scrollerRef.value && onScroll) {
      scrollerRef.value.removeEventListener("scroll", onScroll)
    }
    
  })

  defineExpose({ containerRef, scrollerRef })

  return { containerRef, scrollerRef }
}
