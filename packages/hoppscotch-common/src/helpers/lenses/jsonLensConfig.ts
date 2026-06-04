/**
 * JSON Lens Configuration
 * Centralized configuration for JSON rendering optimizations
 */

export interface JSONLensConfig {
  // WebWorker settings
  enableWebWorker: boolean
  webWorkerThreshold: number // bytes
  webWorkerTimeout: number // milliseconds

  // Cache settings
  enableCache: boolean
  cacheMaxSize: number // bytes
  cacheEvictionPolicy: 'lru' | 'lfu'

  // Rendering settings
  enableIncremental: boolean
  incrementalChunkSize: number // lines
  enableDeferredLoading: boolean

  // Filter settings
  enableJQLazyLoading: boolean
  jqPreloadStrategy: 'manual' | 'auto' | 'on-tab-open'

  // Performance settings
  enablePerformanceMonitoring: boolean
  enableMetricsLogging: boolean
  performanceThreshold: number // milliseconds - log if exceeded

  // CodeMirror settings
  enableCodemirrorOptimizations: boolean
  enableViewportRendering: boolean

  // Streaming settings
  enableStreaming: boolean
  streamingChunkSize: number // bytes
}

/**
 * Default configuration
 */
export const DEFAULT_JSON_LENS_CONFIG: JSONLensConfig = {
  enableWebWorker: true,
  webWorkerThreshold: 500000, // 500KB
  webWorkerTimeout: 30000, // 30 seconds

  enableCache: true,
  cacheMaxSize: 50 * 1024 * 1024, // 50MB
  cacheEvictionPolicy: 'lru',

  enableIncremental: true,
  incrementalChunkSize: 100,
  enableDeferredLoading: true,

  enableJQLazyLoading: true,
  jqPreloadStrategy: 'on-tab-open',

  enablePerformanceMonitoring: true,
  enableMetricsLogging: import.meta.env.DEV,
  performanceThreshold: 1000, // 1 second

  enableCodemirrorOptimizations: true,
  enableViewportRendering: true,

  enableStreaming: true,
  streamingChunkSize: 65536, // 64KB
}

/**
 * Configuration presets
 */
export const CONFIG_PRESETS = {
  // Maximum performance (aggressive optimization)
  PERFORMANCE: {
    ...DEFAULT_JSON_LENS_CONFIG,
    enableWebWorker: true,
    webWorkerThreshold: 100000, // Lower threshold
    enableCache: true,
    cacheMaxSize: 100 * 1024 * 1024,
    enableIncremental: true,
    incrementalChunkSize: 50,
  },

  // Balanced (default)
  BALANCED: DEFAULT_JSON_LENS_CONFIG,

  // Compatibility (minimal optimizations)
  COMPATIBILITY: {
    ...DEFAULT_JSON_LENS_CONFIG,
    enableWebWorker: false,
    enableCache: true,
    cacheMaxSize: 10 * 1024 * 1024,
    enableIncremental: false,
    enableJQLazyLoading: true,
    enableCodemirrorOptimizations: false,
  },

  // Debug (enable all monitoring)
  DEBUG: {
    ...DEFAULT_JSON_LENS_CONFIG,
    enablePerformanceMonitoring: true,
    enableMetricsLogging: true,
    performanceThreshold: 100, // Log everything > 100ms
  },
}

let currentConfig: JSONLensConfig = { ...DEFAULT_JSON_LENS_CONFIG }

/**
 * Get current configuration
 */
export function getJSONLensConfig(): JSONLensConfig {
  return currentConfig
}

/**
 * Update configuration
 */
export function updateJSONLensConfig(updates: Partial<JSONLensConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...updates,
  }

  // Log configuration change in debug mode
  if (import.meta.env.DEV) {
    console.debug('[JSON Lens Config Updated]', currentConfig)
  }
}

/**
 * Apply preset configuration
 */
export function applyConfigPreset(
  presetName: keyof typeof CONFIG_PRESETS
): void {
  const preset = CONFIG_PRESETS[presetName]
  if (!preset) {
    console.warn(`Unknown preset: ${presetName}`)
    return
  }

  currentConfig = { ...preset }

  if (import.meta.env.DEV) {
    console.debug(`[JSON Lens Config] Applied preset: ${presetName}`, currentConfig)
  }
}

/**
 * Reset to default configuration
 */
export function resetJSONLensConfig(): void {
  currentConfig = { ...DEFAULT_JSON_LENS_CONFIG }

  if (import.meta.env.DEV) {
    console.debug('[JSON Lens Config] Reset to defaults', currentConfig)
  }
}

/**
 * Get configuration as JSON
 */
export function exportJSONLensConfig(): string {
  return JSON.stringify(currentConfig, null, 2)
}

/**
 * Import configuration from JSON
 */
export function importJSONLensConfig(json: string): void {
  try {
    const config = JSON.parse(json) as Partial<JSONLensConfig>
    updateJSONLensConfig(config)
  } catch (error) {
    console.error('Failed to import configuration:', error)
    throw new Error('Invalid configuration JSON')
  }
}
