import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { ref, readonly } from "vue"

interface DocumentationItem {
  type: "folder" | "request"
  item: HoppCollection | HoppRESTRequest
  parentPath: string
  id: string
  folderPath?: string | null
  requestIndex?: number | null
}

const worker = new Worker(
  new URL("../helpers/workers/documentation.worker.ts", import.meta.url),
  {
    type: "module",
  }
)

export function useDocumentationWorker() {
  const isProcessing = ref<boolean>(false)
  const progress = ref<number>(0)
  const processedCount = ref<number>(0)
  const totalCount = ref<number>(0)

  let resolvePromise: ((items: DocumentationItem[]) => void) | null = null
  let rejectPromise: ((error: Error) => void) | null = null

  /**
   * Initialize the worker and set up message handlers
   */
  function initWorker(): Worker {
    console.log("Initializing documentation worker", worker)

    worker.onmessage = (event) => {
      const { type } = event.data

      switch (type) {
        case "DOCUMENTATION_PROGRESS":
          progress.value = event.data.progress
          processedCount.value = event.data.processed
          totalCount.value = event.data.total
          break

        case "DOCUMENTATION_RESULT":
          isProcessing.value = false
          progress.value = 100
          if (resolvePromise) {
            // Parse the stringified items
            const items = JSON.parse(event.data.items) as DocumentationItem[]
            resolvePromise(items)
            resolvePromise = null
            rejectPromise = null
          }
          break

        case "DOCUMENTATION_ERROR":
          isProcessing.value = false
          progress.value = 0
          if (rejectPromise) {
            rejectPromise(new Error(event.data.error))
            resolvePromise = null
            rejectPromise = null
          }
          break
      }
    }

    worker.onerror = (error) => {
      isProcessing.value = false
      progress.value = 0
      if (rejectPromise) {
        rejectPromise(new Error(`Worker error: ${error.message}`))
        resolvePromise = null
        rejectPromise = null
      }
    }

    return worker
  }

  /**
   * Process documentation using the worker
   */
  function processDocumentation(
    collection: HoppCollection,
    collectionPath: string | null
  ): Promise<DocumentationItem[]> {
    return new Promise((resolve, reject) => {
      if (!collection) {
        resolve([])
        return
      }

      isProcessing.value = true
      progress.value = 0
      processedCount.value = 0
      totalCount.value = 0

      resolvePromise = resolve
      rejectPromise = reject

      const currentWorker = initWorker()

      // Stringify the collection before sending to worker
      try {
        const collectionString = JSON.stringify(collection)
        currentWorker.postMessage({
          type: "GATHER_DOCUMENTATION",
          collection: collectionString,
          collectionPath,
        })
      } catch (error) {
        isProcessing.value = false
        reject(
          new Error(
            `Failed to serialize collection: ${error instanceof Error ? error.message : String(error)}`
          )
        )
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
