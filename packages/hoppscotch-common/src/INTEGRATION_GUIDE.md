# JSON Lens Integration Guide

## Overview

This guide explains how to integrate the new JSON rendering optimizations into your components and workflows.

## Quick Start

### Basic Integration

```typescript
import { useIntegratedJSONOptimization } from '~/composables/lenses/useIntegratedJSONOptimization'

export default {
  setup(props) {
    const jsonContent = ref('')
    const optimization = useIntegratedJSONOptimization(jsonContent)

    const render = async () => {
      const parsed = await optimization.executeOptimizedRender()
      // Use parsed data
    }

    return { render, optimization }
  }
}
```

### Using the Configuration System

```typescript
import {
  getJSONLensConfig,
  updateJSONLensConfig,
  applyConfigPreset,
} from '~/helpers/lenses/jsonLensConfig'

// Get current config
const config = getJSONLensConfig()

// Apply preset
applyConfigPreset('PERFORMANCE') // or 'BALANCED', 'COMPATIBILITY', 'DEBUG'

// Customize config
updateJSONLensConfig({
  enableWebWorker: true,
  webWorkerThreshold: 250000, // Lower threshold
  cacheMaxSize: 100 * 1024 * 1024,
})
```

### Performance Monitoring

```typescript
import { useJSONLensPerformanceMonitor } from '~/composables/lenses/useJSONLensPerformanceMonitor'

export default {
  setup() {
    const monitor = useJSONLensPerformanceMonitor()

    // Get diagnostics
    const diag = monitor.getDiagnostics()
    console.log(`Render time: ${diag.currentRenderTime}ms`)
    console.log(`Cache hit rate: ${diag.cacheHitRate}x`)

    // Start continuous monitoring
    const stopMonitoring = monitor.startMonitoring((diag) => {
      if (diag.bottlenecks.length > 0) {
        console.warn('Bottlenecks detected:', diag.bottlenecks)
      }
    })

    // Export diagnostics
    const report = monitor.exportDiagnostics()

    return { monitor, stopMonitoring }
  }
}
```

## Component Integration

### JSONLensRenderer Integration

The JSONLensRenderer component now automatically uses:

1. **Lazy-loaded jq-wasm** - No longer blocks initial load
2. **Response caching** - Repeated views are instant
3. **WebWorker parsing** - Large responses don't freeze UI
4. **Incremental rendering** - Progressive rendering for huge JSON

#### No changes needed! The optimizations are automatic.

### Creating Custom JSON Viewers

```typescript
import { useOptimizedJSONRendering } from '~/composables/lenses/useOptimizedJSONRendering'
import { useResponseStreaming } from '~/composables/lenses/useResponseStreaming'
import { useIncrementalJSONRendering } from '~/composables/lenses/useIncrementalJSONRendering'

export default {
  setup() {
    const jsonString = ref('')
    const rendering = useOptimizedJSONRendering(jsonString)
    const streaming = useResponseStreaming()
    const incremental = useIncrementalJSONRendering(jsonString, 50)

    // For streaming responses
    const handleChunk = (chunk: string) => {
      streaming.appendChunk(chunk)
      const { json, remaining } = streaming.tryExtractCompleteJSON()
      if (json) {
        jsonString.value = json
      }
    }

    // For large responses
    const renderLarge = async () => {
      const result = await incremental.startIncrementalRender()
      console.log(`Rendering ${incremental.renderState.progress}% complete`)
    }

    return { rendering, streaming, incremental, handleChunk, renderLarge }
  }
}
```

## Utility Functions

### Export JSON

```typescript
import { exportToFile, generateResponseStats } from '~/helpers/lenses/jsonExportUtils'

// Export in different formats
exportToFile(jsonString, 'response.json', 'pretty-json')
exportToFile(jsonString, 'response.csv', 'csv')
exportToFile(jsonString, 'response.jsonl', 'jsonl')

// Get stats
const stats = generateResponseStats(jsonString)
console.log(`Response size: ${stats.sizeFormatted}`)
console.log(`Depth: ${stats.depth}`)
console.log(`Keys: ${stats.keys}`)
```

### Transform JSON

```typescript
import {
  flattenJSON,
  mergeJSON,
  removeSensitiveData,
  diffJSON,
  filterJSONByPath,
} from '~/helpers/lenses/jsonTransform'

// Flatten structure
const flat = flattenJSON(jsonObj)

// Merge responses
const merged = mergeJSON(json1, json2, json3)

// Sanitize sensitive data
const safe = removeSensitiveData(jsonString, ['password', 'token', 'apiKey'])

// Compare responses
const { added, removed, modified } = diffJSON(json1, json2)

// Filter by path
const filtered = filterJSONByPath(jsonString, /^user\./)
```

### Accessibility

```typescript
import { useJSONAccessibility } from '~/helpers/lenses/jsonAccessibility'

const a11y = useJSONAccessibility()

// Get accessible description
const label = a11y.getAccessibleLabel(jsonString)

// Format for screen reader
const readable = a11y.formatForReading(jsonString)

// Get navigation map
const navMap = a11y.getNavigationMap(jsonString)

// Enhance element
a11y.enhanceAccessibility(element)
```

## Performance Tips

### 1. Use Response Caching

```typescript
// Cache is automatic, but you can check it
import { useJSONResponseCache } from '~/helpers/lenses/jsonResponseCache'

const cache = useJSONResponseCache()
const stats = cache.getStats()
console.log(`Cache hit rate: ${stats.hitRate}`)
```

### 2. Enable Preloading

```typescript
import { preloadJQ } from '~/helpers/lenses/jqLazyLoader'

// Preload jq-wasm during idle time
preloadJQ().then(() => {
  console.log('JQ ready for filtering')
})
```

### 3. Monitor Performance

```typescript
import { recordJSONPerformance } from '~/helpers/lenses/performanceMonitoring'

const start = performance.now()
// ... rendering code ...
const end = performance.now()

recordJSONPerformance({
  responseSize: jsonString.length,
  parseTime: end - start,
  renderTime: 0,
  isLargeResponse: jsonString.length > 500000,
})
```

## Configuration for Different Scenarios

### High-Performance Environment (Production)

```typescript
applyConfigPreset('PERFORMANCE')
updateJSONLensConfig({
  cacheMaxSize: 100 * 1024 * 1024,
  webWorkerThreshold: 100000, // Aggressive WebWorker usage
})
```

### Development Environment

```typescript
applyConfigPreset('DEBUG')
updateJSONLensConfig({
  enablePerformanceMonitoring: true,
  enableMetricsLogging: true,
})
```

### Low-Resource Environment

```typescript
applyConfigPreset('COMPATIBILITY')
updateJSONLensConfig({
  enableWebWorker: false,
  cacheMaxSize: 5 * 1024 * 1024,
})
```

## Troubleshooting

### Large responses still slow

1. Check configuration: `getJSONLensConfig()`
2. Enable WebWorker: `enableWebWorker: true`
3. Monitor: Use `useJSONLensPerformanceMonitor()` to identify bottlenecks

### WebWorker not working

- Check browser support
- Fallback to main thread is automatic
- Use compatibility mode if needed

### Cache memory growing

- Check cache stats: `cache.getStats()`
- Reduce cache size: `updateJSONLensConfig({ cacheMaxSize: 10 * 1024 * 1024 })`
- Clear cache if needed: `cache.clear()`

## Advanced Customization

### Custom Optimization Strategy

```typescript
import { useIntegratedJSONOptimization } from '~/composables/lenses/useIntegratedJSONOptimization'

const optimization = useIntegratedJSONOptimization(jsonContent, {
  enableWebWorker: true,
  webWorkerThreshold: 200000,
  enableCache: true,
  cacheMaxSize: 25 * 1024 * 1024,
})
```

### Custom Performance Monitoring

```typescript
import { useJSONLensPerformanceMonitor } from '~/composables/lenses/useJSONLensPerformanceMonitor'

const monitor = useJSONLensPerformanceMonitor()

monitor.startMonitoring((diag) => {
  // Custom logic
  if (diag.currentRenderTime > 2000) {
    alert('Rendering is slow!')
  }
})
```

## API Reference

See [PERFORMANCE_IMPROVEMENTS.md](./PERFORMANCE_IMPROVEMENTS.md) for detailed API documentation.

## Support

For issues or questions, refer to GitHub issue #6291.
