/**
 * Virtual Scrolling for JSON Trees
 * 
 * Implements efficient virtual scrolling for rendering large JSON trees
 * without rendering all DOM nodes at once.
 */

import { ref, Ref, computed } from 'vue'

export interface VirtualScrollState {
  containerHeight: number
  itemHeight: number
  scrollTop: number
  totalItems: number
  visibleStart: number
  visibleEnd: number
  visibleItems: number
}

export interface JSONTreeNode {
  id: string
  key: string
  value: unknown
  level: number
  isExpanded: boolean
  hasChildren: boolean
  children?: JSONTreeNode[]
}

export function useVirtualScrolling(itemHeight: number = 24) {
  const containerRef: Ref<HTMLElement | null> = ref(null)
  const containerHeight = ref(600)
  const scrollTop = ref(0)
  const items = ref<JSONTreeNode[]>([])
  const expandedNodes = ref<Set<string>>(new Set())

  // Flatten and filter visible items based on expansion
  const flattenedItems = computed(() => {
    const result: JSONTreeNode[] = []

    function flatten(nodes: JSONTreeNode[]) {
      for (const node of nodes) {
        result.push(node)
        if (node.isExpanded && node.children) {
          flatten(node.children)
        }
      }
    }

    flatten(items.value)
    return result
  })

  // Calculate visible range
  const visibleStart = computed(() => {
    return Math.max(0, Math.floor(scrollTop.value / itemHeight))
  })

  const visibleEnd = computed(() => {
    return Math.min(
      flattenedItems.value.length,
      visibleStart.value + Math.ceil(containerHeight.value / itemHeight) + 1
    )
  })

  const visibleItems = computed(() => {
    return flattenedItems.value.slice(visibleStart.value, visibleEnd.value)
  })

  const offsetY = computed(() => {
    return visibleStart.value * itemHeight
  })

  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  const toggleExpansion = (nodeId: string) => {
    if (expandedNodes.value.has(nodeId)) {
      expandedNodes.value.delete(nodeId)
    } else {
      expandedNodes.value.add(nodeId)
    }

    // Update the actual tree
    updateNodeExpansion(items.value, nodeId, expandedNodes.value.has(nodeId))
  }

  const updateNodeExpansion = (nodes: JSONTreeNode[], nodeId: string, expanded: boolean) => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        node.isExpanded = expanded
        return
      }
      if (node.children) {
        updateNodeExpansion(node.children, nodeId, expanded)
      }
    }
  }

  const setItems = (newItems: JSONTreeNode[]) => {
    items.value = newItems
    scrollTop.value = 0
    expandedNodes.value.clear()
  }

  const getState = (): VirtualScrollState => ({
    containerHeight: containerHeight.value,
    itemHeight,
    scrollTop: scrollTop.value,
    totalItems: flattenedItems.value.length,
    visibleStart: visibleStart.value,
    visibleEnd: visibleEnd.value,
    visibleItems: visibleEnd.value - visibleStart.value,
  })

  return {
    containerRef,
    containerHeight,
    scrollTop,
    items,
    visibleItems,
    offsetY,
    visibleStart,
    visibleEnd,
    handleScroll,
    toggleExpansion,
    setItems,
    getState,
    flattenedItems,
  }
}

/**
 * Convert JSON object to virtual scroll tree structure
 */
export function jsonToTreeNodes(json: unknown, maxDepth: number = 50): JSONTreeNode[] {
  let nodeId = 0

  function convert(
    value: unknown,
    key: string,
    level: number,
    parent?: JSONTreeNode
  ): JSONTreeNode {
    const id = `node-${++nodeId}`
    const isObject = value !== null && typeof value === 'object'
    const isArray = Array.isArray(value)
    const hasChildren = isObject && Object.keys(value as Record<string, unknown>).length > 0

    const node: JSONTreeNode = {
      id,
      key,
      value: isObject ? (isArray ? `[${(value as unknown[]).length}]` : '{...}') : value,
      level,
      isExpanded: level < 2, // Auto-expand first 2 levels
      hasChildren,
      children: [],
    }

    if (hasChildren && level < maxDepth) {
      const obj = value as Record<string, unknown>
      node.children = Object.entries(obj).map(([k, v]) => convert(v, k, level + 1, node))
    }

    return node
  }

  if (typeof json === 'object' && json !== null) {
    const obj = json as Record<string, unknown>
    return Object.entries(obj).map(([k, v]) => convert(v, k, 0))
  }

  return [convert(json, 'root', 0)]
}

/**
 * Virtual scrolling with search/filter
 */
export function useFilterableVirtualScrolling(itemHeight: number = 24) {
  const baseScrolling = useVirtualScrolling(itemHeight)
  const searchQuery = ref('')
  const searchResults = ref<JSONTreeNode[]>([])

  const filterItems = (query: string) => {
    searchQuery.value = query.toLowerCase()

    if (!query) {
      searchResults.value = baseScrolling.flattenedItems.value
      return
    }

    const results: JSONTreeNode[] = []

    function search(nodes: JSONTreeNode[]): boolean {
      let hasMatch = false

      for (const node of nodes) {
        let nodeMatches = false

        if (
          node.key.toLowerCase().includes(searchQuery.value) ||
          String(node.value).toLowerCase().includes(searchQuery.value)
        ) {
          nodeMatches = true
          node.isExpanded = true
        }

        if (node.children) {
          const childrenHaveMatches = search(node.children)
          if (childrenHaveMatches) {
            node.isExpanded = true
            nodeMatches = true
          }
        }

        if (nodeMatches) {
          results.push(node)
          hasMatch = true
        }
      }

      return hasMatch
    }

    search(baseScrolling.items.value)
    searchResults.value = results
  }

  return {
    ...baseScrolling,
    searchQuery,
    filterItems,
    searchResults,
  }
}

/**
 * Calculate tree node statistics
 */
export function getTreeStatistics(nodes: JSONTreeNode[]) {
  let totalNodes = 0
  let maxDepth = 0
  let objectCount = 0
  let arrayCount = 0
  let leafCount = 0

  function traverse(node: JSONTreeNode, depth: number) {
    totalNodes++
    maxDepth = Math.max(maxDepth, depth)

    if (node.hasChildren) {
      if (Array.isArray(node.value)) {
        arrayCount++
      } else {
        objectCount++
      }
    } else {
      leafCount++
    }

    if (node.children) {
      node.children.forEach((child) => traverse(child, depth + 1))
    }
  }

  nodes.forEach((node) => traverse(node, 0))

  return {
    totalNodes,
    maxDepth,
    objectCount,
    arrayCount,
    leafCount,
  }
}

/**
 * Memory-efficient tree rendering with pagination
 */
export function usePagedTreeRendering(
  items: JSONTreeNode[],
  pageSize: number = 1000
) {
  const currentPage = ref(0)
  const totalPages = computed(() => Math.ceil(items.length / pageSize))

  const currentPageItems = computed(() => {
    const start = currentPage.value * pageSize
    const end = start + pageSize
    return items.slice(start, end)
  })

  const nextPage = () => {
    if (currentPage.value < totalPages.value - 1) {
      currentPage.value++
    }
  }

  const prevPage = () => {
    if (currentPage.value > 0) {
      currentPage.value--
    }
  }

  const goToPage = (page: number) => {
    currentPage.value = Math.max(0, Math.min(page, totalPages.value - 1))
  }

  return {
    currentPage: computed(() => currentPage.value),
    totalPages,
    currentPageItems,
    nextPage,
    prevPage,
    goToPage,
  }
}
