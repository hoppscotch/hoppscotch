/**
 * Composable for lazy loading the JSON Lens Renderer
 * Defers component registration until the response tab is actually viewed
 * Reduces initial bundle load and improves first interaction time
 */

import { defineAsyncComponent, Component, ref, watch } from 'vue'

let cachedRenderer: Component | null = null

/**
 * Get the JSON Lens Renderer component with intelligent caching
 * Provides a cached component after first load to prevent re-loads
 */
export function useJSONRendererLazy(): {
  renderer: Component
  isLoading: boolean
} {
  const isLoading = ref(false)

  // Return cached renderer if available
  if (cachedRenderer) {
    return {
      renderer: cachedRenderer,
      isLoading: false,
    }
  }

  // Create async component wrapper
  const renderer = defineAsyncComponent({
    loader: async () => {
      try {
        isLoading.value = true
        // Dynamically import the renderer to split it into separate chunk
        const module = await import(
          /* webpackChunkName: "json-lens-renderer" */
          '~/components/lenses/renderers/JSONLensRenderer.vue'
        )
        const component = module.default
        cachedRenderer = component
        return component
      } catch (error) {
        console.error('Failed to load JSON renderer:', error)
        throw error
      } finally {
        isLoading.value = false
      }
    },
    delay: 0,
    timeout: 10000,
    // Show skeleton/loader while loading
    loadingComponent: {
      template: `
        <div class="flex items-center justify-center h-full">
          <div class="animate-spin">Loading...</div>
        </div>
      `,
    },
    errorComponent: {
      template: `
        <div class="flex items-center justify-center h-full text-red-500">
          Failed to load renderer
        </div>
      `,
    },
  })

  return {
    renderer,
    isLoading,
  }
}

/**
 * Preload the JSON renderer in the background
 * Can be called after a response is received but before user switches tabs
 */
export function preloadJSONRenderer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (cachedRenderer) {
      resolve()
      return
    }

    // Use requestIdleCallback if available for non-blocking preload
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(async () => {
        try {
          const module = await import(
            /* webpackChunkName: "json-lens-renderer" */
            '~/components/lenses/renderers/JSONLensRenderer.vue'
          )
          cachedRenderer = module.default
          resolve()
        } catch (error) {
          // Preload failures are non-critical
          console.debug('JSON renderer preload failed:', error)
          reject(error)
        }
      })
    } else {
      // Fallback to setTimeout if requestIdleCallback is not available
      setTimeout(async () => {
        try {
          const module = await import(
            /* webpackChunkName: "json-lens-renderer" */
            '~/components/lenses/renderers/JSONLensRenderer.vue'
          )
          cachedRenderer = module.default
          resolve()
        } catch (error) {
          console.debug('JSON renderer preload failed:', error)
          reject(error)
        }
      }, 1000)
    }
  })
}

/**
 * Clear the cached renderer
 * Useful for testing or memory management
 */
export function clearJSONRendererCache(): void {
  cachedRenderer = null
}
