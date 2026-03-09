import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { ref, readonly } from "vue"

export interface DocumentationItem {
  type: "folder" | "request"
  item: HoppCollection | HoppRESTRequest
  parentPath: string
  id: string
  pathOrID?: string | null
  folderPath?: string | null
  requestIndex?: number | null
  requestID?: string | null
}

interface QueueItem {
  collection: HoppCollection
  pathOrID: string | null
  isTeamCollection: boolean
  resolve: (items: DocumentationItem[]) => void
  reject: (error: Error) => void
}

const worker = new Worker(
  new URL("../helpers/workers/documentation.worker.ts", import.meta.url),
  {
    type: "module",
  }
)

// Global queue state
const queue: QueueItem[] = []
let isWorkerBusy = false

// Global state refs (shared across composables)
const isProcessing = ref<boolean>(false)
const progress = ref<number>(0)
const processedCount = ref<number>(0)
const totalCount = ref<number>(0)

// Worker message handler
worker.onmessage = (event) => {
  const { type } = event.data

  switch (type) {
    case "DOCUMENTATION_PROGRESS":
      progress.value = event.data.progress
      processedCount.value = event.data.processed
      totalCount.value = event.data.total
      break

    case "DOCUMENTATION_RESULT":
      if (queue.length > 0) {
        const currentItem = queue[0] // The item currently being processed

        // Parse the stringified items
        const items = JSON.parse(event.data.items) as DocumentationItem[]
        currentItem.resolve(items)

        // Remove completed item and process next
        queue.shift()
        processQueue()
      }
      break

    case "DOCUMENTATION_ERROR":
      if (queue.length > 0) {
        const currentItem = queue[0]
        currentItem.reject(new Error(event.data.error))

        // Remove failed item and process next
        queue.shift()
        processQueue()
      }
      break
  }
}

worker.onerror = (error) => {
  if (queue.length > 0) {
    const currentItem = queue[0]
    currentItem.reject(new Error(`Worker error: ${error.message}`))

    // Remove failed item and process next
    queue.shift()
    processQueue()
  }
}

function processQueue() {
  if (queue.length === 0) {
    isWorkerBusy = false
    isProcessing.value = false
    progress.value = 100 // Ensure progress shows complete
    return
  }

  isWorkerBusy = true
  isProcessing.value = true
  progress.value = 0
  processedCount.value = 0
  totalCount.value = 0

  const nextItem = queue[0]

  try {
    const collectionString = JSON.stringify(nextItem.collection)
    worker.postMessage({
      type: "GATHER_DOCUMENTATION",
      collection: collectionString,
      pathOrID: nextItem.pathOrID,
      isTeamCollection: nextItem.isTeamCollection,
    })
  } catch (error) {
    nextItem.reject(
      new Error(
        `Failed to serialize collection: ${error instanceof Error ? error.message : String(error)}`
      )
    )
    queue.shift()
    processQueue()
  }
}

export function useDocumentationWorker() {
  /**
   * Process documentation using the worker
   */
  function processDocumentation(
    collection: HoppCollection,
    pathOrID: string | null,
    isTeamCollection: boolean = false
  ): Promise<DocumentationItem[]> {
    return new Promise((resolve, reject) => {
      if (!collection) {
        resolve([])
        return
      }

      // Add to queue
      queue.push({
        collection,
        pathOrID,
        isTeamCollection,
        resolve,
        reject,
      })

      // If worker is not busy, start processing
      if (!isWorkerBusy) {
        processQueue()
      }
    })
  }

  return {
    isProcessing: readonly(isProcessing),
    progress: readonly(progress),
    processedCount: readonly(processedCount),
    totalCount: readonly(totalCount),
    processDocumentation,
  }
}
