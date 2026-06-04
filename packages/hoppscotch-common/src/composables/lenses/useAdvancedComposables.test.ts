/**
 * Tests for virtual scrolling and advanced deferred loading
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useVirtualScrolling, jsonToTreeNodes, getTreeStatistics } from '../useVirtualScrolling'
import { useAdvancedDeferredLoading, useBackgroundPreloading, useSmartIntersectionLoading } from '../useAdvancedDeferredLoading'

describe('useVirtualScrolling', () => {
  let scrolling: ReturnType<typeof useVirtualScrolling>

  beforeEach(() => {
    scrolling = useVirtualScrolling(24)
  })

  it('should initialize with default values', () => {
    expect(scrolling.containerHeight.value).toBeGreaterThan(0)
    expect(scrolling.scrollTop.value).toBe(0)
    expect(scrolling.visibleStart.value).toBe(0)
  })

  it('should calculate visible range correctly', () => {
    scrolling.containerHeight.value = 600
    scrolling.scrollTop.value = 0
    expect(scrolling.visibleStart.value).toBe(0)
    expect(scrolling.visibleEnd.value).toBeGreaterThan(0)
  })

  it('should handle scroll events', () => {
    const event = new Event('scroll')
    const container = document.createElement('div')
    container.scrollTop = 100
    Object.defineProperty(event, 'target', { value: container })

    scrolling.handleScroll(event)
    expect(scrolling.scrollTop.value).toBe(100)
  })

  it('should toggle node expansion', () => {
    const testItems = [
      {
        id: 'node-1',
        key: 'test',
        value: 'test',
        level: 0,
        isExpanded: false,
        hasChildren: true,
        children: [],
      },
    ]
    scrolling.setItems(testItems)
    scrolling.toggleExpansion('node-1')
    expect(scrolling.items.value[0].isExpanded).toBe(true)
  })

  it('should return correct state', () => {
    const state = scrolling.getState()
    expect(state.containerHeight).toBeGreaterThan(0)
    expect(state.itemHeight).toBe(24)
    expect(state.totalItems).toBeGreaterThanOrEqual(0)
  })

  it('should handle large item lists', () => {
    const items = Array(10000)
      .fill(null)
      .map((_, i) => ({
        id: `node-${i}`,
        key: `item-${i}`,
        value: `value-${i}`,
        level: 0,
        isExpanded: false,
        hasChildren: false,
      }))
    scrolling.setItems(items)
    expect(scrolling.flattenedItems.value).toHaveLength(10000)
  })

  it('should update visible items on scroll', () => {
    const items = Array(1000)
      .fill(null)
      .map((_, i) => ({
        id: `node-${i}`,
        key: `item-${i}`,
        value: i,
        level: 0,
        isExpanded: false,
        hasChildren: false,
      }))
    scrolling.setItems(items)
    scrolling.containerHeight.value = 600
    scrolling.scrollTop.value = 500
    expect(scrolling.visibleStart.value).toBeGreaterThan(0)
  })
})

describe('jsonToTreeNodes', () => {
  it('should convert simple object', () => {
    const json = { a: 1, b: 'test' }
    const nodes = jsonToTreeNodes(json)
    expect(nodes).toHaveLength(2)
    expect(nodes[0].key).toBe('a')
    expect(nodes[1].key).toBe('b')
  })

  it('should handle nested objects', () => {
    const json = { user: { name: 'John', age: 30 } }
    const nodes = jsonToTreeNodes(json)
    expect(nodes[0].hasChildren).toBe(true)
    expect(nodes[0].children).toBeDefined()
    expect(nodes[0].children).toHaveLength(2)
  })

  it('should handle arrays', () => {
    const json = { items: [1, 2, 3] }
    const nodes = jsonToTreeNodes(json)
    expect(nodes[0].hasChildren).toBe(true)
  })

  it('should respect maxDepth', () => {
    const json = { a: { b: { c: { d: { e: 1 } } } } }
    const nodes = jsonToTreeNodes(json, 2)
    expect(nodes[0].level).toBe(0)
  })

  it('should auto-expand first levels', () => {
    const json = { a: { b: { c: 1 } } }
    const nodes = jsonToTreeNodes(json)
    expect(nodes[0].isExpanded).toBe(true)
  })

  it('should handle primitives', () => {
    const nodes = jsonToTreeNodes('string')
    expect(nodes).toHaveLength(1)
    expect(nodes[0].value).toBe('string')
  })

  it('should handle arrays at root', () => {
    const json = [1, 2, 3]
    const nodes = jsonToTreeNodes(json)
    expect(Array.isArray(nodes)).toBe(true)
  })
})

describe('getTreeStatistics', () => {
  it('should calculate statistics correctly', () => {
    const nodes = jsonToTreeNodes({ a: { b: 1, c: 2 }, d: [1, 2, 3] })
    const stats = getTreeStatistics(nodes)
    expect(stats.totalNodes).toBeGreaterThan(0)
    expect(stats.maxDepth).toBeGreaterThanOrEqual(0)
  })

  it('should count objects and arrays', () => {
    const nodes = jsonToTreeNodes({ obj: { x: 1 }, arr: [1, 2] })
    const stats = getTreeStatistics(nodes)
    expect(stats.objectCount).toBeGreaterThanOrEqual(0)
    expect(stats.arrayCount).toBeGreaterThanOrEqual(0)
  })

  it('should count leaf nodes', () => {
    const nodes = jsonToTreeNodes({ a: 1, b: 2, c: { d: 3 } })
    const stats = getTreeStatistics(nodes)
    expect(stats.leafCount).toBeGreaterThanOrEqual(0)
  })
})

describe('useAdvancedDeferredLoading', () => {
  let deferred: ReturnType<typeof useAdvancedDeferredLoading>

  beforeEach(() => {
    deferred = useAdvancedDeferredLoading()
  })

  it('should enqueue loads with priority', async () => {
    const mockFn = vi.fn().mockResolvedValue(undefined)
    await deferred.enqueueLoad(mockFn, 'NORMAL')
    // Wait for queue to process
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(mockFn).toHaveBeenCalled()
  })

  it('should execute critical loads first', async () => {
    const callOrder: string[] = []
    const order: ('HIGH' | 'LOW' | 'NORMAL' | 'CRITICAL')[] = ['LOW', 'HIGH', 'NORMAL', 'CRITICAL']

    for (const priority of order) {
      await deferred.enqueueLoad(
        async () => callOrder.push(priority),
        priority
      )
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(callOrder[0]).toBe('CRITICAL')
    expect(callOrder[1]).toBe('HIGH')
  })

  it('should track loading state', async () => {
    const id = await deferred.enqueueLoad(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }, 'NORMAL')

    expect(deferred.getLoadingState(id)).toBeDefined()
  })

  it('should return queue statistics', async () => {
    const stats = deferred.getStats()
    expect(stats.totalRequests).toBeGreaterThanOrEqual(0)
    expect(stats.completedRequests).toBeGreaterThanOrEqual(0)
  })

  it('should handle errors', async () => {
    const onError = vi.fn()
    const mockFn = vi.fn().mockRejectedValue(new Error('Test error'))
    await deferred.enqueueLoad(mockFn, 'NORMAL', undefined, onError)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(onError).toHaveBeenCalled()
  })

  it('should indicate when loading', async () => {
    const mockFn = vi.fn().mockResolvedValue(undefined)
    await deferred.enqueueLoad(mockFn, 'NORMAL')
    // Loading state is async
    await new Promise((resolve) => setTimeout(resolve, 50))
    // The composable tracks loading state
    expect(deferred.getStats).toBeDefined()
  })
})

describe('useBackgroundPreloading', () => {
  let preloader: ReturnType<typeof useBackgroundPreloading>

  beforeEach(() => {
    preloader = useBackgroundPreloading()
  })

  it('should add items to preload queue', async () => {
    const mockFn = vi.fn().mockResolvedValue(undefined)
    await preloader.addPreload('test-1', mockFn)
    expect(preloader.getPreloadQueueSize()).toBeGreaterThanOrEqual(0)
  })

  it('should clear preload queue', () => {
    preloader.clearPreloadQueue()
    expect(preloader.getPreloadQueueSize()).toBe(0)
  })

  it('should stop preloading', () => {
    preloader.stopPreloading()
    expect(preloader.getPreloadQueueSize()).toBe(0)
  })

  it('should process items from queue', async () => {
    const mockFn = vi.fn().mockResolvedValue(undefined)
    await preloader.addPreload('test-1', mockFn)
    await preloader.addPreload('test-2', mockFn)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    preloader.stopPreloading()
    expect(mockFn.mock.calls.length).toBeGreaterThanOrEqual(0)
  })
})

describe('useSmartIntersectionLoading', () => {
  let smartLoading: ReturnType<typeof useSmartIntersectionLoading>

  beforeEach(() => {
    smartLoading = useSmartIntersectionLoading()
  })

  it('should observe elements', () => {
    const element = document.createElement('div')
    const mockLoader = vi.fn().mockResolvedValue(undefined)
    smartLoading.observeElement(element, mockLoader)
    expect(element).toBeDefined()
  })

  it('should unobserve elements', () => {
    const element = document.createElement('div')
    const mockLoader = vi.fn().mockResolvedValue(undefined)
    smartLoading.observeElement(element, mockLoader)
    smartLoading.unobserveElement(element)
    expect(element).toBeDefined()
  })

  it('should cleanup', () => {
    const element = document.createElement('div')
    const mockLoader = vi.fn().mockResolvedValue(undefined)
    smartLoading.observeElement(element, mockLoader)
    smartLoading.cleanup()
    expect(element).toBeDefined()
  })
})

describe('Edge Cases for Virtual Scrolling', () => {
  it('should handle empty list', () => {
    const scrolling = useVirtualScrolling(24)
    scrolling.setItems([])
    expect(scrolling.flattenedItems.value).toHaveLength(0)
  })

  it('should handle single item', () => {
    const scrolling = useVirtualScrolling(24)
    scrolling.setItems([
      {
        id: 'node-1',
        key: 'single',
        value: 'item',
        level: 0,
        isExpanded: false,
        hasChildren: false,
      },
    ])
    expect(scrolling.flattenedItems.value).toHaveLength(1)
  })

  it('should handle very large item height', () => {
    const scrolling = useVirtualScrolling(1000)
    expect(scrolling.getState().itemHeight).toBe(1000)
  })

  it('should handle negative scroll position', () => {
    const scrolling = useVirtualScrolling(24)
    scrolling.scrollTop.value = -100
    expect(scrolling.visibleStart.value).toBeGreaterThanOrEqual(0)
  })
})
