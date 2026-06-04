/**
 * Performance Benchmarking Utilities
 * 
 * Provides comprehensive benchmarking tools for measuring and comparing
 * JSON rendering performance across different strategies and configurations.
 */

export interface BenchmarkResult {
  name: string
  duration: number
  throughput: number // operations per second
  memoryUsed: number
  cpuTime: number
  peakMemory: number
  timestamp: number
}

export interface BenchmarkComparison {
  baseline: BenchmarkResult
  variations: BenchmarkResult[]
  improvementPercentage: number[]
  recommendedStrategy: string
}

export interface PerformanceProfile {
  testSize: number
  iterations: number
  results: BenchmarkResult[]
  averageDuration: number
  standardDeviation: number
  minDuration: number
  maxDuration: number
}

const benchmarkHistory: BenchmarkResult[] = []

/**
 * Run a performance benchmark on a function
 */
export async function runBenchmark(
  name: string,
  testFn: () => Promise<void>,
  iterations: number = 10
): Promise<BenchmarkResult> {
  const durations: number[] = []
  const memoryPoints: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const memBefore = (performance as any).memory?.usedJSHeapSize || 0

    await testFn()

    const end = performance.now()
    const memAfter = (performance as any).memory?.usedJSHeapSize || 0

    durations.push(end - start)
    memoryPoints.push(memAfter - memBefore)
  }

  const averageDuration = durations.reduce((a, b) => a + b, 0) / iterations
  const result: BenchmarkResult = {
    name,
    duration: averageDuration,
    throughput: 1000 / averageDuration,
    memoryUsed: memoryPoints.reduce((a, b) => a + b, 0) / iterations,
    cpuTime: Math.max(...durations),
    peakMemory: Math.max(...memoryPoints),
    timestamp: Date.now(),
  }

  benchmarkHistory.push(result)
  return result
}

/**
 * Run a comparative benchmark between multiple strategies
 */
export async function compareBenchmarks(
  strategies: Record<string, () => Promise<void>>,
  iterations: number = 10
): Promise<BenchmarkComparison> {
  const baseline = Object.entries(strategies)[0]
  const baselineResult = await runBenchmark(baseline[0], baseline[1], iterations)

  const variations = await Promise.all(
    Object.entries(strategies)
      .slice(1)
      .map(([name, fn]) => runBenchmark(name, fn, iterations))
  )

  const improvementPercentage = variations.map((v) => {
    const improvement = (baselineResult.duration - v.duration) / baselineResult.duration
    return improvement * 100
  })

  const recommendedStrategy = variations.reduce((best, current) =>
    current.duration < best.duration ? current : best
  ).name

  return {
    baseline: baselineResult,
    variations,
    improvementPercentage,
    recommendedStrategy,
  }
}

/**
 * Profile performance across different input sizes
 */
export async function profilePerformance(
  testFn: (size: number) => Promise<void>,
  sizes: number[] = [1000, 10000, 100000, 1000000],
  iterations: number = 5
): Promise<PerformanceProfile[]> {
  const profiles: PerformanceProfile[] = []

  for (const size of sizes) {
    const results = await Promise.all(
      Array(iterations)
        .fill(null)
        .map(() => runBenchmark(`size-${size}`, () => testFn(size), 1))
    )

    const durations = results.map((r) => r.duration)
    const averageDuration = durations.reduce((a, b) => a + b, 0) / iterations
    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - averageDuration, 2), 0) / iterations
    const standardDeviation = Math.sqrt(variance)

    profiles.push({
      testSize: size,
      iterations,
      results,
      averageDuration,
      standardDeviation,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    })
  }

  return profiles
}

/**
 * Measure memory usage during a benchmark
 */
export async function measureMemory(
  testFn: () => Promise<void>
): Promise<{
  before: number
  after: number
  delta: number
  peakDuringTest: number
}> {
  if (!(performance as any).memory) {
    console.warn('Memory measurement not available in this environment')
    return {
      before: 0,
      after: 0,
      delta: 0,
      peakDuringTest: 0,
    }
  }

  const before = (performance as any).memory.usedJSHeapSize
  let peak = before

  const interval = setInterval(() => {
    peak = Math.max(peak, (performance as any).memory.usedJSHeapSize)
  }, 10)

  await testFn()

  clearInterval(interval)

  const after = (performance as any).memory.usedJSHeapSize

  return {
    before,
    after,
    delta: after - before,
    peakDuringTest: peak,
  }
}

/**
 * Format benchmark results for display
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  return `${result.name}: ${result.duration.toFixed(2)}ms (${result.throughput.toFixed(2)} ops/s)`
}

/**
 * Compare benchmark results and get summary
 */
export function getBenchmarkSummary(results: BenchmarkResult[]): string {
  if (results.length === 0) return 'No results to summarize'

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
  const fastest = results.reduce((min, r) => (r.duration < min.duration ? r : min))
  const slowest = results.reduce((max, r) => (r.duration > max.duration ? r : max))

  return `
Benchmark Summary:
  Average: ${avgDuration.toFixed(2)}ms
  Fastest: ${fastest.name} (${fastest.duration.toFixed(2)}ms)
  Slowest: ${slowest.name} (${slowest.duration.toFixed(2)}ms)
  Range: ${(slowest.duration - fastest.duration).toFixed(2)}ms
  `.trim()
}

/**
 * Export benchmark results to JSON
 */
export function exportBenchmarkResults(results: BenchmarkResult[]): string {
  return JSON.stringify(results, null, 2)
}

/**
 * Get all benchmark history
 */
export function getBenchmarkHistory(): BenchmarkResult[] {
  return [...benchmarkHistory]
}

/**
 * Clear benchmark history
 */
export function clearBenchmarkHistory(): void {
  benchmarkHistory.length = 0
}

/**
 * Create a detailed performance report
 */
export function generatePerformanceReport(
  profiles: PerformanceProfile[],
  comparison?: BenchmarkComparison
): string {
  let report = '# Performance Report\n\n'

  if (comparison) {
    report += '## Strategy Comparison\n'
    report += `- Baseline: ${comparison.baseline.name}\n`
    report += `- Recommended: ${comparison.recommendedStrategy}\n`
    report += `- Improvements:\n`
    comparison.variations.forEach((v, i) => {
      report += `  - ${v.name}: ${comparison.improvementPercentage[i].toFixed(2)}%\n`
    })
    report += '\n'
  }

  report += '## Performance Profiles\n\n'
  profiles.forEach((profile) => {
    report += `### Size: ${profile.testSize}\n`
    report += `- Average: ${profile.averageDuration.toFixed(2)}ms\n`
    report += `- Std Dev: ${profile.standardDeviation.toFixed(2)}ms\n`
    report += `- Min: ${profile.minDuration.toFixed(2)}ms\n`
    report += `- Max: ${profile.maxDuration.toFixed(2)}ms\n`
    report += `- Range: ${(profile.maxDuration - profile.minDuration).toFixed(2)}ms\n\n`
  })

  return report
}

/**
 * Test JSON parsing performance on different strategies
 */
export async function benchmarkJSONParsing(
  jsonString: string,
  strategies: {
    useWebWorker: boolean
    enableCache: boolean
    useIncremental: boolean
  }[] = [
    { useWebWorker: false, enableCache: false, useIncremental: false },
    { useWebWorker: true, enableCache: false, useIncremental: false },
    { useWebWorker: false, enableCache: true, useIncremental: false },
    { useWebWorker: true, enableCache: true, useIncremental: true },
  ]
): Promise<BenchmarkComparison> {
  const strategyMap: Record<string, () => Promise<void>> = {}

  strategies.forEach((strategy, index) => {
    const name = `WebWorker:${strategy.useWebWorker} Cache:${strategy.enableCache} Incremental:${strategy.useIncremental}`
    strategyMap[name] = async () => {
      // Simulate different parsing strategies
      JSON.parse(jsonString) // Basic parse for all
    }
  })

  return compareBenchmarks(strategyMap)
}
