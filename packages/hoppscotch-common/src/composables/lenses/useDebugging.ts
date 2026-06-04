/**
 * JSON Rendering Debugging and Diagnostics
 * 
 * Provides comprehensive debugging tools, diagnostics, and performance
 * tracing for JSON rendering operations.
 */

import { ref, Ref } from 'vue'

export interface TraceEvent {
  name: string
  phase: 'start' | 'end'
  timestamp: number
  duration?: number
  metadata?: Record<string, unknown>
}

export interface DebugSession {
  id: string
  startTime: number
  endTime?: number
  events: TraceEvent[]
  metrics: Map<string, number[]>
  warnings: string[]
}

export interface DebugMetrics {
  parseTime: number
  renderTime: number
  memoryUsed: number
  cacheHits: number
  cacheMisses: number
  workerCalls: number
  mainThreadCalls: number
}

class DebugTracer {
  private sessions: Map<string, DebugSession> = new Map()
  private activeSession: DebugSession | null = null
  private sessionId = 0
  private enabled = false

  enable(): void {
    this.enabled = true
  }

  disable(): void {
    this.enabled = false
  }

  startSession(name: string = 'debug-session'): string {
    if (!this.enabled) return ''

    const sessionId = `session-${++this.sessionId}`
    const session: DebugSession = {
      id: sessionId,
      startTime: performance.now(),
      events: [],
      metrics: new Map(),
      warnings: [],
    }

    this.sessions.set(sessionId, session)
    this.activeSession = session
    this.traceEvent('Session', 'start', { name })

    return sessionId
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.endTime = performance.now()
    this.traceEvent('Session', 'end')
    this.activeSession = null
  }

  traceEvent(
    name: string,
    phase: 'start' | 'end',
    metadata?: Record<string, unknown>
  ): void {
    if (!this.enabled || !this.activeSession) return

    const event: TraceEvent = {
      name,
      phase,
      timestamp: performance.now(),
      metadata,
    }

    this.activeSession.events.push(event)

    // Calculate duration for 'end' events
    if (phase === 'end') {
      const startEvent = this.activeSession.events
        .filter((e) => e.name === name && e.phase === 'start')
        .pop()
      if (startEvent) {
        event.duration = event.timestamp - startEvent.timestamp
      }
    }
  }

  recordMetric(name: string, value: number): void {
    if (!this.enabled || !this.activeSession) return

    if (!this.activeSession.metrics.has(name)) {
      this.activeSession.metrics.set(name, [])
    }
    this.activeSession.metrics.get(name)!.push(value)
  }

  addWarning(message: string): void {
    if (!this.enabled || !this.activeSession) return
    this.activeSession.warnings.push(message)
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId)
  }

  getAllSessions(): DebugSession[] {
    return Array.from(this.sessions.values())
  }

  getMetrics(sessionId: string): DebugMetrics | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    return {
      parseTime: this.getAverageMetric(session, 'parseTime'),
      renderTime: this.getAverageMetric(session, 'renderTime'),
      memoryUsed: this.getAverageMetric(session, 'memoryUsed'),
      cacheHits: this.getTotalMetric(session, 'cacheHits'),
      cacheMisses: this.getTotalMetric(session, 'cacheMisses'),
      workerCalls: this.getTotalMetric(session, 'workerCalls'),
      mainThreadCalls: this.getTotalMetric(session, 'mainThreadCalls'),
    }
  }

  private getAverageMetric(session: DebugSession, name: string): number {
    const values = session.metrics.get(name) || []
    if (values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  private getTotalMetric(session: DebugSession, name: string): number {
    const values = session.metrics.get(name) || []
    return values.reduce((a, b) => a + b, 0)
  }

  generateReport(sessionId: string): string {
    const session = this.sessions.get(sessionId)
    if (!session) return 'Session not found'

    let report = `Debug Session Report: ${session.id}\n`
    report += '='.repeat(50) + '\n\n'

    const duration = (session.endTime || performance.now()) - session.startTime
    report += `Duration: ${duration.toFixed(2)}ms\n`
    report += `Events: ${session.events.length}\n`
    report += `Warnings: ${session.warnings.length}\n\n`

    const metrics = this.getMetrics(sessionId)
    if (metrics) {
      report += 'Metrics:\n'
      report += `  Parse Time: ${metrics.parseTime.toFixed(2)}ms\n`
      report += `  Render Time: ${metrics.renderTime.toFixed(2)}ms\n`
      report += `  Memory Used: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB\n`
      report += `  Cache Hits: ${metrics.cacheHits}\n`
      report += `  Cache Misses: ${metrics.cacheMisses}\n`
      report += `  Worker Calls: ${metrics.workerCalls}\n`
      report += `  Main Thread Calls: ${metrics.mainThreadCalls}\n\n`
    }

    if (session.warnings.length > 0) {
      report += 'Warnings:\n'
      session.warnings.forEach((w) => {
        report += `  - ${w}\n`
      })
      report += '\n'
    }

    // Slow events
    const slowEvents = session.events.filter((e) => e.duration && e.duration > 100)
    if (slowEvents.length > 0) {
      report += 'Slow Operations (> 100ms):\n'
      slowEvents.forEach((e) => {
        report += `  - ${e.name}: ${e.duration?.toFixed(2)}ms\n`
      })
    }

    return report
  }

  clear(): void {
    this.sessions.clear()
    this.activeSession = null
  }
}

const tracer = new DebugTracer()

export function useDebugger() {
  const enabled = ref(false)
  const currentSessionId: Ref<string | null> = ref(null)
  const sessions: Ref<DebugSession[]> = ref([])

  const startSession = (name?: string): string => {
    if (!enabled.value) {
      tracer.enable()
      enabled.value = true
    }

    const sessionId = tracer.startSession(name)
    currentSessionId.value = sessionId
    sessions.value = tracer.getAllSessions()
    return sessionId
  }

  const endSession = (): void => {
    if (currentSessionId.value) {
      tracer.endSession(currentSessionId.value)
      sessions.value = tracer.getAllSessions()
      currentSessionId.value = null
    }
  }

  const trace = (name: string, phase: 'start' | 'end', metadata?: Record<string, unknown>): void => {
    tracer.traceEvent(name, phase, metadata)
  }

  const recordMetric = (name: string, value: number): void => {
    tracer.recordMetric(name, value)
  }

  const addWarning = (message: string): void => {
    tracer.addWarning(message)
  }

  const getReport = (sessionId?: string): string => {
    return tracer.generateReport(sessionId || currentSessionId.value || '')
  }

  const getMetrics = (sessionId?: string): DebugMetrics | null => {
    return tracer.getMetrics(sessionId || currentSessionId.value || '')
  }

  const getSessions = (): DebugSession[] => {
    return tracer.getAllSessions()
  }

  const clear = (): void => {
    tracer.clear()
    sessions.value = []
  }

  return {
    enabled,
    currentSessionId,
    sessions,
    startSession,
    endSession,
    trace,
    recordMetric,
    addWarning,
    getReport,
    getMetrics,
    getSessions,
    clear,
  }
}

/**
 * Performance profiler for specific operations
 */
export class PerformanceProfiler {
  private marks: Map<string, number> = new Map()

  start(label: string): void {
    if (performance.mark) {
      performance.mark(`${label}-start`)
    }
    this.marks.set(label, performance.now())
  }

  end(label: string): number {
    const startTime = this.marks.get(label)
    if (!startTime) return 0

    const duration = performance.now() - startTime

    if (performance.mark && performance.measure) {
      performance.mark(`${label}-end`)
      performance.measure(label, `${label}-start`, `${label}-end`)
    }

    return duration
  }

  getMetrics(): PerformanceEntryList {
    return performance.getEntriesByType('measure')
  }

  generateReport(): string {
    let report = 'Performance Profile Report\n'
    report += '==========================\n\n'

    const metrics = this.getMetrics()
    metrics.forEach((metric) => {
      report += `${metric.name}: ${metric.duration.toFixed(2)}ms\n`
    })

    return report
  }

  clear(): void {
    this.marks.clear()
  }
}

export function createProfiler(): PerformanceProfiler {
  return new PerformanceProfiler()
}
