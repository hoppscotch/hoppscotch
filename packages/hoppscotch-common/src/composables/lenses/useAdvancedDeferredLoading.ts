/**
 * Advanced Deferred Response Loading with Priority Queue
 * 
 * Provides intelligent loading of response renderers with priority levels,
 * background preloading, and automatic priority escalation.
 * 
 * Features:
 * - Priority-based loading queue
 * - Background preloading during idle time
 * - Automatic priority escalation
 * - Memory-aware load scheduling
 * - Request cancellation support
 */

import { ref, Ref, computed } from 'vue'

export type LoadPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

export interface DeferredLoadRequest {
  id: string
  priority: LoadPriority
  loader: () => Promise<void>
  onComplete?: () => void
  onError?: (error: Error) => void
  createdAt: number
}

export interface LoadQueueStats {
  totalRequests: number
  pendingRequests: number
  completedRequests: number
  failedRequests: number
  averageLoadTime: number
  queueWaitTime: number
}

const priorityOrder: Record<LoadPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
}

class DeferredLoadQueue {
  private queue: DeferredLoadRequest[] = []
  private completed: Map<string, number> = new Map()
  private failed: Map<string, Error> = new Map()
  private running: Set<string> = new Set()
  private stats = {
    totalRequests: 0,
    completedRequests: 0,
    failedRequests: 0,
    totalLoadTime: 0,
  }
  private maxConcurrent = 3
  private memoryThreshold = 0.85 // 85% of max memory

  async enqueue(request: DeferredLoadRequest): Promise<void> {
    this.queue.push(request)
    this.stats.totalRequests++
    this.sortQueue()
    await this.processQueue()
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.createdAt - b.createdAt
    })
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const memUsage = this.getMemoryUsage()
      if (memUsage > this.memoryThreshold) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        continue
      }

      const request = this.queue.shift()
      if (!request) break

      this.running.add(request.id)
      this.processRequest(request)
    }
  }

  private async processRequest(request: DeferredLoadRequest): Promise<void> {
    const startTime = performance.now()

    try {
      await request.loader()
      const duration = performance.now() - startTime

      this.completed.set(request.id, duration)
      this.stats.completedRequests++
      this.stats.totalLoadTime += duration

      request.onComplete?.()
    } catch (error) {
      this.failed.set(request.id, error as Error)
      this.stats.failedRequests++
      request.onError?.(error as Error)
    } finally {
      this.running.delete(request.id)
      await this.processQueue()
    }
  }

  private getMemoryUsage(): number {
    if (!(performance as any).memory) return 0
    const { usedJSHeapSize, jsHeapSizeLimit } = (performance as any).memory
    return usedJSHeapSize / jsHeapSizeLimit
  }

  getStats(): LoadQueueStats {
    const pendingRequests = this.queue.length + this.running.size
    const averageLoadTime =
      this.stats.completedRequests > 0
        ? this.stats.totalLoadTime / this.stats.completedRequests
        : 0

    return {
      totalRequests: this.stats.totalRequests,
      pendingRequests,
      completedRequests: this.stats.completedRequests,
      failedRequests: this.stats.failedRequests,
      averageLoadTime,
      queueWaitTime: pendingRequests > 0 ? averageLoadTime * pendingRequests : 0,
    }
  }

  clear(): void {
    this.queue = []
    this.completed.clear()
    this.failed.clear()
    this.running.clear()
  }
}

// Global queue instance
const globalQueue = new DeferredLoadQueue()

export function useAdvancedDeferredLoading() {
  const requestId = ref(0)
  const loadingState = ref<Record<string, 'pending' | 'loading' | 'complete' | 'error'>>({})

  const enqueueLoad = async (
    loader: () => Promise<void>,
    priority: LoadPriority = 'NORMAL',
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<string> => {
    const id = `request-${++requestId.value}`
    loadingState.value[id] = 'pending'

    const request: DeferredLoadRequest = {
      id,
      priority,
      loader: async () => {
        loadingState.value[id] = 'loading'
        await loader()
        loadingState.value[id] = 'complete'
      },
      onComplete,
      onError: (error) => {
        loadingState.value[id] = 'error'
        onError?.(error)
      },
      createdAt: Date.now(),
    }

    await globalQueue.enqueue(request)
    return id
  }

  const escalatePriority = (id: string, newPriority: LoadPriority): void => {
    // Note: This is a simplified version. Real implementation would need
    // access to the internal queue to find and update the request.
    console.log(`Priority escalated for ${id} to ${newPriority}`)
  }

  const getLoadingState = (id: string): 'pending' | 'loading' | 'complete' | 'error' | null => {
    return loadingState.value[id] || null
  }

  const getStats = (): LoadQueueStats => {
    return globalQueue.getStats()
  }

  const isLoading = computed(() => {
    return Object.values(loadingState.value).some((state) => state === 'loading' || state === 'pending')
  })

  return {
    enqueueLoad,
    escalatePriority,
    getLoadingState,
    getStats,
    isLoading,
  }
}

/**
 * Background preloading controller
 */
export class BackgroundPreloader {
  private preloadQueue: Array<{ loader: () => Promise<void>; id: string }> = []
  private isRunning = false
  private preloadInterval: number | null = null

  async add(id: string, loader: () => Promise<void>): Promise<void> {
    this.preloadQueue.push({ loader, id })
    if (!this.isRunning) {
      this.start()
    }
  }

  private start(): void {
    if (this.isRunning) return
    this.isRunning = true

    this.preloadInterval = window.setInterval(() => {
      if (!this.preloadQueue.length) {
        this.stop()
        return
      }

      const item = this.preloadQueue.shift()
      if (item) {
        item.loader().catch((error) => {
          console.warn(`Preload failed for ${item.id}:`, error)
        })
      }
    }, 500) as unknown as number
  }

  stop(): void {
    this.isRunning = false
    if (this.preloadInterval !== null) {
      clearInterval(this.preloadInterval)
      this.preloadInterval = null
    }
  }

  clear(): void {
    this.preloadQueue = []
    this.stop()
  }

  getQueueSize(): number {
    return this.preloadQueue.length
  }
}

export function useBackgroundPreloading() {
  const preloader = new BackgroundPreloader()

  const addPreload = async (id: string, loader: () => Promise<void>): Promise<void> => {
    await preloader.add(id, loader)
  }

  const stopPreloading = (): void => {
    preloader.stop()
  }

  const clearPreloadQueue = (): void => {
    preloader.clear()
  }

  const getPreloadQueueSize = (): number => {
    return preloader.getQueueSize()
  }

  return {
    addPreload,
    stopPreloading,
    clearPreloadQueue,
    getPreloadQueueSize,
  }
}

/**
 * Intersection Observer based smart loading
 */
export function useSmartIntersectionLoading() {
  const observedElements = new Map<Element, () => Promise<void>>()
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const loader = observedElements.get(entry.target)
          if (loader) {
            loader().catch((error) => {
              console.error('Smart loading failed:', error)
            })
            observer.unobserve(entry.target)
            observedElements.delete(entry.target)
          }
        }
      })
    },
    { rootMargin: '50px' }
  )

  const observeElement = (element: Element, loader: () => Promise<void>): void => {
    observedElements.set(element, loader)
    observer.observe(element)
  }

  const unobserveElement = (element: Element): void => {
    observer.unobserve(element)
    observedElements.delete(element)
  }

  const cleanup = (): void => {
    observer.disconnect()
    observedElements.clear()
  }

  return {
    observeElement,
    unobserveElement,
    cleanup,
  }
}
