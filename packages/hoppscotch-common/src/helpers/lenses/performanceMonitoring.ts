/**
 * Performance Monitoring for JSON Rendering
 * Tracks rendering time, response size, and provides performance metrics
 */

import { ref, computed } from 'vue'

interface PerformanceMetrics {
  responseSize: number
  parseTime: number
  renderTime: number
  totalTime: number
  isLargeResponse: boolean
  timestamp: number
}

const metrics = ref<PerformanceMetrics | null>(null)
const metricsHistory = ref<PerformanceMetrics[]>([])

/**
 * Record performance metrics for JSON rendering
 */
export function recordJSONPerformance(data: {
  responseSize: number
  parseTime: number
  renderTime: number
  isLargeResponse?: boolean
}): void {
  const now = performance.now()
  const metric: PerformanceMetrics = {
    responseSize: data.responseSize,
    parseTime: data.parseTime,
    renderTime: data.renderTime,
    totalTime: data.parseTime + data.renderTime,
    isLargeResponse: data.isLargeResponse ?? false,
    timestamp: now,
  }

  metrics.value = metric
  metricsHistory.value.push(metric)

  // Keep only last 50 metrics
  if (metricsHistory.value.length > 50) {
    metricsHistory.value.shift()
  }

  // Log metrics for debugging
  if (import.meta.env.DEV) {
    console.debug('[JSON Performance]', {
      size: `${(data.responseSize / 1024 / 1024).toFixed(2)}MB`,
      parse: `${data.parseTime.toFixed(2)}ms`,
      render: `${data.renderTime.toFixed(2)}ms`,
      total: `${metric.totalTime.toFixed(2)}ms`,
      isLarge: data.isLargeResponse,
    })
  }
}

/**
 * Get current performance metrics
 */
export function getCurrentMetrics(): PerformanceMetrics | null {
  return metrics.value
}

/**
 * Get average performance metrics from history
 */
export function getAverageMetrics(): {
  avgParseTime: number
  avgRenderTime: number
  avgTotalTime: number
  avgResponseSize: number
} {
  if (metricsHistory.value.length === 0) {
    return {
      avgParseTime: 0,
      avgRenderTime: 0,
      avgTotalTime: 0,
      avgResponseSize: 0,
    }
  }

  const sum = metricsHistory.value.reduce(
    (acc, m) => ({
      parseTime: acc.parseTime + m.parseTime,
      renderTime: acc.renderTime + m.renderTime,
      totalTime: acc.totalTime + m.totalTime,
      responseSize: acc.responseSize + m.responseSize,
    }),
    { parseTime: 0, renderTime: 0, totalTime: 0, responseSize: 0 }
  )

  const count = metricsHistory.value.length

  return {
    avgParseTime: sum.parseTime / count,
    avgRenderTime: sum.renderTime / count,
    avgTotalTime: sum.totalTime / count,
    avgResponseSize: sum.responseSize / count,
  }
}

/**
 * Clear metrics history
 */
export function clearMetricsHistory(): void {
  metrics.value = null
  metricsHistory.value = []
}

/**
 * Composable for using performance metrics in components
 */
export function useJSONPerformanceMetrics() {
  return {
    currentMetrics: computed(() => metrics.value),
    metricsHistory: computed(() => metricsHistory.value),
    recordMetrics: recordJSONPerformance,
    getAverageMetrics,
  }
}
