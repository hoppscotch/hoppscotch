/**
 * JSON Lens Performance Monitor Composable
 * Provides real-time performance monitoring and diagnostics
 */

import { ref, computed } from 'vue'
import {
  getCurrentMetrics,
  getAverageMetrics,
  getJSONPerformanceMetrics,
} from '~/helpers/lenses/performanceMonitoring'
import { getJSONResponseCache } from '~/helpers/lenses/jsonResponseCache'
import { getJSONLensConfig } from '~/helpers/lenses/jsonLensConfig'

interface PerformanceDiagnostics {
  currentRenderTime: number
  averageRenderTime: number
  cacheHitRate: number
  cacheUtilization: number
  activeOptimizations: string[]
  recommendations: string[]
  bottlenecks: string[]
}

/**
 * Composable for performance monitoring and diagnostics
 */
export function useJSONLensPerformanceMonitor() {
  const showDiagnostics = ref(false)
  const diagnosticsRefreshRate = ref(1000) // milliseconds

  /**
   * Get comprehensive diagnostics
   */
  const getDiagnostics = (): PerformanceDiagnostics => {
    const metrics = getCurrentMetrics()
    const avgMetrics = getAverageMetrics()
    const cacheStats = getJSONResponseCache().getStats()
    const config = getJSONLensConfig()

    const currentRenderTime = metrics?.totalTime ?? 0
    const averageRenderTime = avgMetrics.avgTotalTime

    // Determine active optimizations
    const activeOptimizations: string[] = []
    if (config.enableWebWorker) activeOptimizations.push('WebWorker')
    if (config.enableCache) activeOptimizations.push('Response Cache')
    if (config.enableIncremental) activeOptimizations.push('Incremental Rendering')
    if (config.enableJQLazyLoading) activeOptimizations.push('JQ Lazy Loading')
    if (config.enableCodemirrorOptimizations) activeOptimizations.push('CodeMirror Optimization')

    // Generate recommendations
    const recommendations: string[] = []
    if (averageRenderTime > config.performanceThreshold) {
      recommendations.push('Consider reducing response size or enabling WebWorker')
    }
    if (cacheStats.utilization > 90) {
      recommendations.push('Cache is nearly full - consider increasing cache size')
    }
    if (cacheStats.hitRate < 0.5 && config.enableCache) {
      recommendations.push('Low cache hit rate - responses may be too diverse')
    }

    // Identify bottlenecks
    const bottlenecks: string[] = []
    if (metrics?.parseTime ?? 0 > metrics?.renderTime ?? 0) {
      bottlenecks.push('Parsing is taking longer than rendering')
    }
    if (cacheStats.entries === 0 && config.enableCache) {
      bottlenecks.push('Cache is not being utilized effectively')
    }
    if (currentRenderTime > 5000) {
      bottlenecks.push('Render time exceeds 5 seconds - consider pagination')
    }

    return {
      currentRenderTime,
      averageRenderTime,
      cacheHitRate: cacheStats.hitRate,
      cacheUtilization: cacheStats.utilizationPercent,
      activeOptimizations,
      recommendations,
      bottlenecks,
    }
  }

  /**
   * Get diagnostics report as formatted string
   */
  const getDiagnosticsReport = (): string => {
    const diag = getDiagnostics()
    const lines: string[] = [
      '=== JSON Lens Performance Diagnostics ===',
      '',
      'Current Performance:',
      `  Render Time: ${diag.currentRenderTime.toFixed(2)}ms`,
      `  Average Render Time: ${diag.averageRenderTime.toFixed(2)}ms`,
      '',
      'Cache Performance:',
      `  Hit Rate: ${diag.cacheHitRate.toFixed(2)}x`,
      `  Utilization: ${diag.cacheUtilization}%`,
      '',
      'Active Optimizations:',
      ...diag.activeOptimizations.map((opt) => `  ✓ ${opt}`),
      '',
    ]

    if (diag.recommendations.length > 0) {
      lines.push('Recommendations:')
      diag.recommendations.forEach((rec) => lines.push(`  → ${rec}`))
      lines.push('')
    }

    if (diag.bottlenecks.length > 0) {
      lines.push('Bottlenecks:')
      diag.bottlenecks.forEach((bn) => lines.push(`  ⚠ ${bn}`))
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Export diagnostics for debugging
   */
  const exportDiagnostics = (): string => {
    const diag = getDiagnostics()
    const metrics = getCurrentMetrics()
    const avgMetrics = getAverageMetrics()
    const cache = getJSONResponseCache()
    const config = getJSONLensConfig()

    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        diagnostics: diag,
        currentMetrics: metrics,
        averageMetrics: avgMetrics,
        cacheStats: cache.getStats(),
        config: config,
      },
      null,
      2
    )
  }

  /**
   * Log diagnostics to console
   */
  const logDiagnostics = (): void => {
    console.log(getDiagnosticsReport())
    if (import.meta.env.DEV) {
      console.table(getDiagnostics())
    }
  }

  /**
   * Start continuous monitoring
   */
  const startMonitoring = (callback?: (diag: PerformanceDiagnostics) => void) => {
    const intervalId = setInterval(() => {
      const diag = getDiagnostics()
      callback?.(diag)

      // Auto-log if any bottlenecks detected
      if (diag.bottlenecks.length > 0) {
        console.warn('[JSON Lens] Bottleneck detected:', diag.bottlenecks)
      }
    }, diagnosticsRefreshRate.value)

    return () => clearInterval(intervalId)
  }

  return {
    showDiagnostics: computed(() => showDiagnostics.value),
    diagnosticsRefreshRate: computed(() => diagnosticsRefreshRate.value),
    getDiagnostics,
    getDiagnosticsReport,
    exportDiagnostics,
    logDiagnostics,
    startMonitoring,
    setRefreshRate: (rate: number) => {
      diagnosticsRefreshRate.value = rate
    },
    toggleDiagnostics: () => {
      showDiagnostics.value = !showDiagnostics.value
    },
  }
}

/**
 * Print performance comparison table
 */
export function comparePerformanceMetrics(
  label1: string,
  metrics1: any,
  label2: string,
  metrics2: any
): void {
  console.table({
    [label1]: metrics1,
    [label2]: metrics2,
  })
}
