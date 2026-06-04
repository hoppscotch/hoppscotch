/**
 * JSON Lens Optimization System Initialization
 * 
 * Central initialization point for all JSON rendering optimizations.
 * This module registers all strategies, configures defaults, and sets up
 * the optimization system for use.
 */

import { registerDefaultRecoveryStrategies } from './useErrorHandling'
import { getJSONLensConfig, applyConfigPreset } from '../helpers/lenses/jsonLensConfig'

/**
 * Initialize the entire JSON lens optimization system
 */
export function initializeJSONLensOptimizations(): void {
  // Register error recovery strategies
  registerDefaultRecoveryStrategies()

  // Apply default configuration preset
  applyConfigPreset('BALANCED')

  // Log initialization
  console.debug('[JSON Lens] Optimization system initialized with BALANCED preset')
}

/**
 * Initialize with specific preset
 */
export function initializeWithPreset(preset: 'PERFORMANCE' | 'BALANCED' | 'COMPATIBILITY' | 'DEBUG'): void {
  registerDefaultRecoveryStrategies()
  applyConfigPreset(preset)
  console.debug(`[JSON Lens] Optimization system initialized with ${preset} preset`)
}

/**
 * Get all active optimizations
 */
export function getActiveOptimizations(): {
  config: ReturnType<typeof getJSONLensConfig>
  initialized: boolean
  timestamp: number
} {
  return {
    config: getJSONLensConfig(),
    initialized: true,
    timestamp: Date.now(),
  }
}

/**
 * Health check for optimization system
 */
export function healthCheck(): {
  status: 'healthy' | 'degraded' | 'error'
  issues: string[]
  details: Record<string, unknown>
} {
  const issues: string[] = []
  const details: Record<string, unknown> = {}

  try {
    const config = getJSONLensConfig()
    details.configLoaded = true

    // Check if WebWorker is available
    if (config.enableWebWorker && typeof Worker === 'undefined') {
      issues.push('WebWorker requested but not available')
      details.webWorkerAvailable = false
    } else {
      details.webWorkerAvailable = true
    }

    // Check compression support
    if (typeof CompressionStream === 'undefined') {
      issues.push('Compression not available (CompressionStream API)')
      details.compressionAvailable = false
    } else {
      details.compressionAvailable = true
    }

    // Check memory API
    if ((performance as any).memory) {
      details.memoryTrackingAvailable = true
    } else {
      issues.push('Memory tracking not available')
      details.memoryTrackingAvailable = false
    }
  } catch (error) {
    issues.push(`Health check failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  const status = issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'error'

  return { status, issues, details }
}

/**
 * Diagnostic report combining all systems
 */
export function generateDiagnosticReport(): string {
  const health = healthCheck()
  const config = getActiveOptimizations().config

  let report = 'JSON Lens Optimization System - Diagnostic Report\n'
  report += '='.repeat(50) + '\n\n'

  report += `System Status: ${health.status.toUpperCase()}\n\n`

  if (health.issues.length > 0) {
    report += 'Issues:\n'
    health.issues.forEach((issue) => {
      report += `  • ${issue}\n`
    })
    report += '\n'
  }

  report += 'Configuration:\n'
  report += `  • Config Preset: ${config.configPreset}\n`
  report += `  • WebWorker Enabled: ${config.enableWebWorker}\n`
  report += `  • WebWorker Threshold: ${config.webWorkerThreshold / 1024}KB\n`
  report += `  • Cache Enabled: ${config.enableCache}\n`
  report += `  • Cache Max Size: ${config.cacheMaxSize / 1024 / 1024}MB\n`
  report += `  • Incremental Rendering: ${config.enableIncrementalRendering}\n`
  report += `  • Deferred Loading: ${config.enableDeferredLoading}\n`
  report += `  • Performance Monitoring: ${config.enablePerformanceMonitoring}\n\n`

  report += 'Available Features:\n'
  report += `  • Memory Tracking: ${health.details.memoryTrackingAvailable ? '✓' : '✗'}\n`
  report += `  • WebWorker Support: ${health.details.webWorkerAvailable ? '✓' : '✗'}\n`
  report += `  • Compression Support: ${health.details.compressionAvailable ? '✓' : '✗'}\n`

  return report
}
