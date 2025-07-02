import { ref, onMounted, onBeforeUnmount } from "vue"
import { useService } from "dioc/vue"
import { ScrollService } from "~/services/scroll.service"

export function useScrollerRef(
  label: string = "Lens",
  classSelector: string = ".cm-scroller",
  initialScrollTop?: number,
  scrollKey?: string
) {
  const containerRef = ref<HTMLElement | null>(null)
  const scrollerRef = ref<HTMLElement | null>(null)

  const scrollService = useService(ScrollService)

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
          if (scrollKey && scrollService.getScrollForKey(scrollKey) !== undefined) {
            scroller.scrollTop = scrollService.getScrollForKey(scrollKey)!
          } else if (initialScrollTop !== undefined) {
            scroller.scrollTop = initialScrollTop
          }
        })

        onScroll = () => {
          if (scrollKey) {
            scrollService.setScrollForKey(scrollKey, scroller.scrollTop)
          }
        }

        scroller.addEventListener("scroll", onScroll)
      })
      .catch((error) => {
        console.error(`[${label}] Failed to initialize scroller:`, error.message)
      })
  })

  onBeforeUnmount(() => {
    if (scrollerRef.value && onScroll) {
      scrollerRef.value.removeEventListener("scroll", onScroll)
    }
  })

  return { containerRef, scrollerRef }
}
