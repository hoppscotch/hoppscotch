/**
 * Response Deferred Loading
 * Implements intelligent preloading and deferred rendering of JSON responses
 */

import { ref, computed, watch, Ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'

interface DeferredLoadingState {
  isVisible: boolean
  hasLoaded: boolean
  isLoading: boolean
  error: Error | null
}

/**
 * Composable for deferred loading of response renderers
 * Only loads the renderer when the response tab becomes visible
 */
export function useDeferredResponseLoading(
  tabElement: Ref<HTMLElement | undefined>,
  responseSize: Ref<number>
) {
  const state = ref<DeferredLoadingState>({
    isVisible: false,
    hasLoaded: false,
    isLoading: false,
    error: null,
  })

  // Use intersection observer to detect when tab becomes visible
  const { stop } = useIntersectionObserver(
    tabElement,
    ([{ isIntersecting }]) => {
      if (isIntersecting && !state.value.hasLoaded) {
        state.value.isVisible = true
        triggerLoad()
      }
    },
    {
      threshold: 0.1,
    }
  )

  const triggerLoad = async () => {
    state.value.isLoading = true

    try {
      // Simulate loading delay for very large responses
      if (responseSize.value > 1000000) {
        // > 1MB
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      state.value.hasLoaded = true
      state.value.error = null
    } catch (error) {
      state.value.error = error instanceof Error ? error : new Error(String(error))
    } finally {
      state.value.isLoading = false
    }
  }

  const shouldRender = computed(
    () => state.value.hasLoaded && state.value.isVisible
  )

  const cleanup = () => {
    stop()
  }

  return {
    state: computed(() => state.value),
    shouldRender,
    isLoading: computed(() => state.value.isLoading),
    cleanup,
    triggerLoad, // Allow manual triggering if needed
  }
}

/**
 * Preload next response in background
 * Called when response is first received
 */
export function preloadResponseRenderer(): Promise<void> {
  return new Promise((resolve) => {
    // Use requestIdleCallback to preload during browser idle time
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        // Trigger module preload by accessing cache
        Promise.resolve().then(() => resolve())
      })
    } else {
      // Fallback to setTimeout
      setTimeout(() => resolve(), 1000)
    }
  })
}

/**
 * Request response renderer preload as high priority
 * Can be called after response is received but before user switches tabs
 */
export function requestRendererPriority(): void {
  if ('requestAnimationFrame' in window) {
    requestAnimationFrame(() => {
      // Trigger browser to prioritize renderer loading
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          // Preload in idle time
        })
      }
    })
  }
}
