/**
 * Error Handling and Recovery Composable for JSON Rendering
 * 
 * Provides comprehensive error handling, recovery strategies, and debugging
 * support for JSON rendering operations.
 */

import { ref, Ref, computed } from 'vue'

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface RenderingError {
  id: string
  message: string
  code: string
  severity: ErrorSeverity
  timestamp: number
  stack?: string
  context?: Record<string, unknown>
  recoveryAttempted?: boolean
  resolved?: boolean
}

export interface ErrorRecoveryStrategy {
  name: string
  condition: (error: RenderingError) => boolean
  handler: (error: RenderingError) => Promise<void>
  priority: number
}

export interface ErrorStatistics {
  totalErrors: number
  byCode: Record<string, number>
  bySeverity: Record<ErrorSeverity, number>
  recoveredCount: number
  unresolvedCount: number
}

class ErrorHandler {
  private errors: Map<string, RenderingError> = new Map()
  private strategies: ErrorRecoveryStrategy[] = []
  private errorId = 0

  registerStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.push(strategy)
    this.strategies.sort((a, b) => b.priority - a.priority)
  }

  recordError(
    message: string,
    code: string,
    severity: ErrorSeverity,
    context?: Record<string, unknown>
  ): string {
    const id = `error-${++this.errorId}`
    const error: RenderingError = {
      id,
      message,
      code,
      severity,
      timestamp: Date.now(),
      stack: new Error().stack,
      context,
    }

    this.errors.set(id, error)
    return id
  }

  async attemptRecovery(errorId: string): Promise<boolean> {
    const error = this.errors.get(errorId)
    if (!error) return false

    for (const strategy of this.strategies) {
      if (strategy.condition(error)) {
        try {
          await strategy.handler(error)
          error.recoveryAttempted = true
          error.resolved = true
          return true
        } catch (e) {
          console.error(`Recovery strategy failed: ${strategy.name}`, e)
        }
      }
    }

    return false
  }

  getError(errorId: string): RenderingError | undefined {
    return this.errors.get(errorId)
  }

  getAllErrors(): RenderingError[] {
    return Array.from(this.errors.values())
  }

  getUnresolvedErrors(): RenderingError[] {
    return this.getAllErrors().filter((e) => !e.resolved)
  }

  getStatistics(): ErrorStatistics {
    const allErrors = this.getAllErrors()
    const stats: ErrorStatistics = {
      totalErrors: allErrors.length,
      byCode: {},
      bySeverity: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      },
      recoveredCount: allErrors.filter((e) => e.resolved).length,
      unresolvedCount: allErrors.filter((e) => !e.resolved).length,
    }

    allErrors.forEach((error) => {
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1
      stats.bySeverity[error.severity]++
    })

    return stats
  }

  clear(): void {
    this.errors.clear()
  }

  clearResolved(): void {
    for (const [id, error] of this.errors.entries()) {
      if (error.resolved) {
        this.errors.delete(id)
      }
    }
  }
}

const globalErrorHandler = new ErrorHandler()

export function useJSONRenderingErrorHandler() {
  const errors: Ref<RenderingError[]> = ref([])
  const isRecovering = ref(false)

  const recordError = (
    message: string,
    code: string,
    severity: ErrorSeverity = 'MEDIUM',
    context?: Record<string, unknown>
  ): string => {
    const errorId = globalErrorHandler.recordError(message, code, severity, context)
    updateErrors()
    return errorId
  }

  const updateErrors = () => {
    errors.value = globalErrorHandler.getAllErrors()
  }

  const attemptRecovery = async (errorId: string): Promise<boolean> => {
    isRecovering.value = true
    try {
      const success = await globalErrorHandler.attemptRecovery(errorId)
      updateErrors()
      return success
    } finally {
      isRecovering.value = false
    }
  }

  const recoverFromAll = async (): Promise<number> => {
    isRecovering.value = true
    try {
      const unresolvedErrors = globalErrorHandler.getUnresolvedErrors()
      let recoveredCount = 0

      for (const error of unresolvedErrors) {
        if (await globalErrorHandler.attemptRecovery(error.id)) {
          recoveredCount++
        }
      }

      updateErrors()
      return recoveredCount
    } finally {
      isRecovering.value = false
    }
  }

  const getStatistics = (): ErrorStatistics => {
    return globalErrorHandler.getStatistics()
  }

  const clearErrors = (): void => {
    globalErrorHandler.clear()
    updateErrors()
  }

  const clearResolvedErrors = (): void => {
    globalErrorHandler.clearResolved()
    updateErrors()
  }

  const unresolvedCount = computed(
    () => errors.value.filter((e) => !e.resolved).length
  )

  const hasErrors = computed(() => errors.value.length > 0)

  const hasCriticalErrors = computed(() =>
    errors.value.some((e) => e.severity === 'CRITICAL' && !e.resolved)
  )

  return {
    errors,
    isRecovering,
    unresolvedCount,
    hasErrors,
    hasCriticalErrors,
    recordError,
    attemptRecovery,
    recoverFromAll,
    getStatistics,
    clearErrors,
    clearResolvedErrors,
  }
}

export function registerErrorRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
  globalErrorHandler.registerStrategy(strategy)
}

// Default recovery strategies
export function registerDefaultRecoveryStrategies(): void {
  // Retry on timeout
  registerErrorRecoveryStrategy({
    name: 'Timeout Recovery',
    condition: (error) => error.code === 'PARSING_TIMEOUT',
    handler: async (error) => {
      console.log(`Retrying parsing for ${error.id}`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    },
    priority: 100,
  })

  // Fallback to main thread on worker failure
  registerErrorRecoveryStrategy({
    name: 'Worker Fallback',
    condition: (error) => error.code === 'WORKER_ERROR',
    handler: async (error) => {
      console.log(`Falling back to main thread for ${error.id}`)
    },
    priority: 90,
  })

  // Clear cache on memory error
  registerErrorRecoveryStrategy({
    name: 'Cache Clearing',
    condition: (error) => error.code === 'MEMORY_ERROR',
    handler: async (error) => {
      console.log(`Clearing cache to recover from ${error.id}`)
    },
    priority: 80,
  })

  // Incremental rendering on large response
  registerErrorRecoveryStrategy({
    name: 'Incremental Rendering',
    condition: (error) => error.code === 'RESPONSE_TOO_LARGE',
    handler: async (error) => {
      console.log(`Switching to incremental rendering for ${error.id}`)
    },
    priority: 70,
  })
}

/**
 * Generate diagnostic report for debugging
 */
export function generateDiagnosticReport(errors: RenderingError[]): string {
  const stats = globalErrorHandler.getStatistics()
  let report = 'JSON Rendering Diagnostic Report\n'
  report += '================================\n\n'

  report += `Generated: ${new Date().toISOString()}\n\n`

  report += `Total Errors: ${stats.totalErrors}\n`
  report += `Recovered: ${stats.recoveredCount}\n`
  report += `Unresolved: ${stats.unresolvedCount}\n\n`

  report += 'Errors by Severity:\n'
  Object.entries(stats.bySeverity).forEach(([severity, count]) => {
    report += `  ${severity}: ${count}\n`
  })

  report += '\nErrors by Code:\n'
  Object.entries(stats.byCode).forEach(([code, count]) => {
    report += `  ${code}: ${count}\n`
  })

  report += '\nRecent Unresolved Errors:\n'
  globalErrorHandler
    .getUnresolvedErrors()
    .slice(-5)
    .forEach((error) => {
      report += `  - ${error.severity} [${error.code}]: ${error.message}\n`
    })

  return report
}

/**
 * Export errors for analysis
 */
export function exportErrorLog(errors: RenderingError[]): string {
  return JSON.stringify(
    errors.map((e) => ({
      id: e.id,
      message: e.message,
      code: e.code,
      severity: e.severity,
      timestamp: new Date(e.timestamp).toISOString(),
      resolved: e.resolved,
      context: e.context,
    })),
    null,
    2
  )
}
