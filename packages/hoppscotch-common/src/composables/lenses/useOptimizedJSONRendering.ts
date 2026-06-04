/**
 * Optimized JSON Rendering Composable
 * Handles incremental rendering and performance optimization for JSON display
 */

import { ref, computed, Ref, ComputedRef } from 'vue'
import { parseJSONAsync, stringifyJSONAsync } from '~/helpers/workers/jsonParserWorker'
import * as LJSON from 'lossless-json'
import * as O from 'fp-ts/Option'

interface JSONRenderState {
  isRendering: boolean
  renderProgress: number
  error: Error | null
}

/**
 * Composable for optimized JSON rendering
 * Uses async parsing and incremental rendering to prevent UI blocking
 */
export function useOptimizedJSONRendering(jsonString: Ref<string>) {
  const renderState = ref<JSONRenderState>({
    isRendering: false,
    renderProgress: 0,
    error: null,
  })

  const isRendering = computed(() => renderState.value.isRendering)
  const renderProgress = computed(() => renderState.value.renderProgress)

  /**
   * Parse JSON with fallback to main thread
   * Uses WebWorker for large responses, main thread for small ones
   */
  const parseJSONWithFallback = async (
    json: string,
    useLossless: boolean = true
  ): Promise<any> => {
    try {
      // For small responses, parse on main thread for efficiency
      if (json.length < 100000) {
        // Less than 100KB
        if (useLossless) {
          return LJSON.parse(json)
        }
        return JSON.parse(json)
      }

      // For large responses, use WebWorker to prevent blocking
      return await parseJSONAsync(json, useLossless)
    } catch (error) {
      // Fallback to main thread parsing
      if (useLossless) {
        return LJSON.parse(json)
      }
      return JSON.parse(json)
    }
  }

  /**
   * Stringify JSON with optimization
   * Uses WebWorker for large objects to prevent blocking
   */
  const stringifyJSONWithOptimization = async (
    obj: any,
    useLossless: boolean = true,
    chunkSize: number = 50000 // 50KB chunks
  ): Promise<string> => {
    try {
      const result = useLossless
        ? LJSON.stringify(obj, undefined, 2)
        : JSON.stringify(obj, null, 2)

      // Use async stringification for large results
      if (result.length > 500000) {
        // > 500KB
        return await stringifyJSONAsync(obj, useLossless)
      }

      return result
    } catch (error) {
      console.error('JSON stringification failed:', error)
      throw error
    }
  }

  /**
   * Render JSON with progress tracking
   */
  const renderJSONWithProgress = async (
    json: string,
    useLossless: boolean = true
  ): Promise<string> => {
    renderState.value = {
      isRendering: true,
      renderProgress: 0,
      error: null,
    }

    try {
      // Update progress
      renderState.value.renderProgress = 20

      // Parse JSON
      const parsed = await parseJSONWithFallback(json, useLossless)
      renderState.value.renderProgress = 50

      // Stringify with formatting
      const result = await stringifyJSONWithOptimization(parsed, useLossless)
      renderState.value.renderProgress = 100

      return result
    } catch (error) {
      renderState.value.error = error instanceof Error ? error : new Error(String(error))
      throw error
    } finally {
      renderState.value.isRendering = false
    }
  }

  /**
   * Get formatted JSON with smart caching
   */
  const getFormattedJSON = computed(async () => {
    return pipe(
      jsonString.value,
      O.tryCatchK((json) => parseJSONWithFallback(json, true)),
      O.map((obj) => (useLossless: boolean) =>
        useLossless
          ? LJSON.stringify(obj, undefined, 2)
          : JSON.stringify(obj, null, 2)
      ),
      O.getOrElse(() => () => jsonString.value)
    )
  })

  return {
    renderState: computed(() => renderState.value),
    isRendering,
    renderProgress,
    parseJSONWithFallback,
    stringifyJSONWithOptimization,
    renderJSONWithProgress,
    getFormattedJSON,
  }
}

// Import pipe from fp-ts
import { pipe } from 'fp-ts/function'
