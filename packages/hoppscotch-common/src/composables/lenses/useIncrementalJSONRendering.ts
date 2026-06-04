/**
 * Incremental JSON Rendering Composable
 * Renders JSON response in chunks to prevent UI blocking
 */

import { ref, computed, watch } from 'vue'
import { recordJSONPerformance } from './performanceMonitoring'

interface IncrementalRenderState {
  isRendering: boolean
  renderedLines: number
  totalLines: number
  progress: number
}

/**
 * Compose for incremental JSON rendering
 * Useful for very large JSON responses
 */
export function useIncrementalJSONRendering(
  jsonString: string,
  chunkSize: number = 100 // lines per chunk
) {
  const renderState = ref<IncrementalRenderState>({
    isRendering: false,
    renderedLines: 0,
    totalLines: 0,
    progress: 0,
  })

  const isRendering = computed(() => renderState.value.isRendering)
  const progress = computed(() => renderState.value.progress)

  const startIncrementalRender = async (): Promise<string> => {
    const startTime = performance.now()
    renderState.value.isRendering = true

    try {
      const lines = jsonString.split('\n')
      renderState.value.totalLines = lines.length

      const result: string[] = []

      for (let i = 0; i < lines.length; i += chunkSize) {
        const chunk = lines.slice(i, i + chunkSize)
        result.push(...chunk)

        renderState.value.renderedLines = Math.min(i + chunkSize, lines.length)
        renderState.value.progress = Math.round(
          (renderState.value.renderedLines / lines.length) * 100
        )

        // Yield to browser to keep UI responsive
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      const renderTime = performance.now() - startTime

      // Record performance metrics
      recordJSONPerformance({
        responseSize: jsonString.length,
        parseTime: 0, // Already parsed
        renderTime,
        isLargeResponse: jsonString.length > 500000,
      })

      return result.join('\n')
    } finally {
      renderState.value.isRendering = false
    }
  }

  return {
    renderState: computed(() => renderState.value),
    isRendering,
    progress,
    startIncrementalRender,
  }
}

/**
 * Get optimal chunk size based on response size
 */
export function getOptimalChunkSize(responseSize: number): number {
  // Adjust chunk size based on response size
  if (responseSize < 100000) return 50 // < 100KB
  if (responseSize < 500000) return 100 // < 500KB
  if (responseSize < 1000000) return 200 // < 1MB
  return 500 // >= 1MB
}
