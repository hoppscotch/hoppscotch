/**
 * Integrated JSON Rendering Optimization
 * Combines all performance optimizations with intelligent decision-making
 */

import { computed, ref, watch, Ref } from 'vue'
import { getCachedJSONResponse, cacheJSONResponse, isJSONResponseCached } from './jsonResponseCache'
import { recordJSONPerformance } from './performanceMonitoring'
import { parseJSONAsync } from '~/helpers/workers/jsonParserWorker'
import * as LJSON from 'lossless-json'

interface RenderStrategy {
  type: 'cached' | 'webworker' | 'mainthread' | 'incremental'
  reason: string
}

interface OptimizationConfig {
  enableWebWorker: boolean
  enableCache: boolean
  enableIncremental: boolean
  webWorkerThreshold: number // bytes
  cacheMaxSize: number // bytes
}

const defaultConfig: OptimizationConfig = {
  enableWebWorker: true,
  enableCache: true,
  enableIncremental: true,
  webWorkerThreshold: 500000, // 500KB
  cacheMaxSize: 50 * 1024 * 1024, // 50MB
}

/**
 * Composable for intelligent JSON rendering optimization
 * Automatically selects the best rendering strategy
 */
export function useIntegratedJSONOptimization(
  jsonContent: Ref<string>,
  config: Partial<OptimizationConfig> = {}
) {
  const mergedConfig = { ...defaultConfig, ...config }

  const strategy = ref<RenderStrategy>({
    type: 'mainthread',
    reason: 'Initial state',
  })

  const isOptimizationActive = ref(false)
  const renderStartTime = ref(0)
  const renderEndTime = ref(0)

  /**
   * Determine optimal rendering strategy
   */
  const determineStrategy = (): RenderStrategy => {
    const content = jsonContent.value
    const size = content.length

    // Check cache first
    if (mergedConfig.enableCache && isJSONResponseCached(content)) {
      return {
        type: 'cached',
        reason: `Response cached, size: ${(size / 1024).toFixed(2)}KB`,
      }
    }

    // For very large responses, use incremental rendering
    if (mergedConfig.enableIncremental && size > 5000000) {
      // > 5MB
      return {
        type: 'incremental',
        reason: `Very large response (${(size / 1024 / 1024).toFixed(2)}MB), using incremental rendering`,
      }
    }

    // For large responses, use WebWorker
    if (
      mergedConfig.enableWebWorker &&
      size > mergedConfig.webWorkerThreshold
    ) {
      return {
        type: 'webworker',
        reason: `Large response (${(size / 1024).toFixed(2)}KB), offloading to WebWorker`,
      }
    }

    // For small responses, use main thread (more efficient)
    return {
      type: 'mainthread',
      reason: `Small response (${size} bytes), using main thread`,
    }
  }

  /**
   * Execute rendering with selected strategy
   */
  const executeOptimizedRender = async (useLossless: boolean = true) => {
    renderStartTime.value = performance.now()
    const currentStrategy = determineStrategy()
    strategy.value = currentStrategy
    isOptimizationActive.value = true

    try {
      let result

      switch (currentStrategy.type) {
        case 'cached':
          result = getCachedJSONResponse(jsonContent.value)
          break

        case 'webworker':
          result = await parseJSONAsync(jsonContent.value, useLossless)
          cacheJSONResponse(jsonContent.value, result)
          break

        case 'incremental':
          // Incremental rendering is handled separately by component
          result = await parseJSONAsync(jsonContent.value, useLossless)
          cacheJSONResponse(jsonContent.value, result)
          break

        case 'mainthread':
        default:
          if (useLossless) {
            result = LJSON.parse(jsonContent.value)
          } else {
            result = JSON.parse(jsonContent.value)
          }
          // Cache small responses too
          if (mergedConfig.enableCache) {
            cacheJSONResponse(jsonContent.value, result)
          }
          break
      }

      renderEndTime.value = performance.now()
      const renderTime = renderEndTime.value - renderStartTime.value

      // Record performance metrics
      recordJSONPerformance({
        responseSize: jsonContent.value.length,
        parseTime: currentStrategy.type === 'cached' ? 0 : renderTime,
        renderTime: currentStrategy.type === 'cached' ? 0 : renderTime,
        isLargeResponse: jsonContent.value.length > mergedConfig.webWorkerThreshold,
      })

      return result
    } finally {
      isOptimizationActive.value = false
    }
  }

  /**
   * Get performance estimate for current response
   */
  const estimateRenderTime = (): number => {
    const size = jsonContent.value.length
    const currentStrategy = determineStrategy()

    // Rough estimates (milliseconds)
    switch (currentStrategy.type) {
      case 'cached':
        return 1
      case 'mainthread':
        return Math.max(1, size / 100000) // ~1ms per 100KB
      case 'webworker':
        return Math.max(10, size / 50000) // ~10ms per 50KB + overhead
      case 'incremental':
        return Math.max(50, size / 10000) // ~50ms + overhead
      default:
        return 0
    }
  }

  /**
   * Preload optimization infrastructure
   */
  const preload = async () => {
    // Preload jq and other heavy modules during idle time
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(async () => {
        try {
          // This will trigger lazy loading of jq if needed
          // Can add more preload logic here
        } catch (error) {
          console.debug('Preload failed:', error)
        }
      })
    }
  }

  return {
    strategy: computed(() => strategy.value),
    isOptimizationActive: computed(() => isOptimizationActive.value),
    determineStrategy,
    executeOptimizedRender,
    estimateRenderTime,
    preload,
    config: computed(() => mergedConfig),
  }
}

/**
 * Get performance recommendation based on response size
 */
export function getPerformanceRecommendation(
  responseSize: number
): {
  recommendation: string
  priority: 'low' | 'medium' | 'high'
  suggestedActions: string[]
} {
  if (responseSize < 100000) {
    return {
      recommendation: 'Response size is optimal',
      priority: 'low',
      suggestedActions: [],
    }
  }

  if (responseSize < 1000000) {
    return {
      recommendation: 'Large response - consider enabling WebWorker',
      priority: 'medium',
      suggestedActions: [
        'Use JSON filtering to narrow results',
        'Request pagination from API',
      ],
    }
  }

  return {
    recommendation: 'Very large response - consider using streaming or pagination',
    priority: 'high',
    suggestedActions: [
      'Implement API pagination',
      'Use JQ filter to reduce data',
      'Consider response compression',
      'Use response streaming if available',
    ],
  }
}
