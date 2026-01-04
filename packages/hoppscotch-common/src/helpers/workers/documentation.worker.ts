import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { DocumentationItem } from "~/composables/useDocumentationWorker"

interface GatherDocumentationMessage {
  type: "GATHER_DOCUMENTATION"
  collection: string // JSON stringified collection
  pathOrID: string | null
  isTeamCollection?: boolean // Flag to indicate team collection
}

interface DocumentationProgressMessage {
  type: "DOCUMENTATION_PROGRESS"
  progress: number
  processed: number
  total: number
}

interface DocumentationResultMessage {
  type: "DOCUMENTATION_RESULT"
  items: string // JSON stringified items array
}

interface DocumentationErrorMessage {
  type: "DOCUMENTATION_ERROR"
  error: string
}

type IncomingDocumentationWorkerMessage = GatherDocumentationMessage

/**
 * Gathers all items with documentation from the collection with async processing
 */
async function gatherAllItems(
  collection: HoppCollection,
  collectionPath: string | null,
  isTeamCollection: boolean = false
): Promise<DocumentationItem[]> {
  const items: DocumentationItem[] = []
  let processedCount = 0
  let totalCount = 0
  let lastProgressUpdate = 0

  if (!collection) {
    return []
  }

  // First pass: count total items
  const countItems = (coll: HoppCollection): number => {
    let count = 0
    if (coll.requests?.length) count += coll.requests.length
    if (coll.folders?.length) {
      count += coll.folders.length
      coll.folders.forEach((folder) => {
        count += countItems(folder)
      })
    }
    return count
  }

  totalCount = countItems(collection)

  // Send initial progress
  self.postMessage({
    type: "DOCUMENTATION_PROGRESS",
    progress: 0,
    processed: 0,
    total: totalCount,
  } satisfies DocumentationProgressMessage)

  const baseCollectionPath = collectionPath || ""
  const BATCH_SIZE = 20 // Process items in larger batches
  const PROGRESS_UPDATE_THRESHOLD = 10 // Update progress every 10%

  /**
   * Update progress with throttling to avoid excessive messages
   */
  const updateProgress = async (force = false) => {
    const progress = Math.round((processedCount / totalCount) * 100)

    if (force || progress - lastProgressUpdate >= PROGRESS_UPDATE_THRESHOLD) {
      self.postMessage({
        type: "DOCUMENTATION_PROGRESS",
        progress,
        processed: processedCount,
        total: totalCount,
      } satisfies DocumentationProgressMessage)

      lastProgressUpdate = progress

      // Yield control less frequently for better performance
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  /**
   * Process folders recursively with optimized batching
   */
  const processFoldersAsync = async (
    folders: HoppCollection[],
    parentPath: string = "",
    currentFolderPath: string = ""
  ): Promise<void> => {
    for (let folderIndex = 0; folderIndex < folders.length; folderIndex++) {
      const folder = folders[folderIndex]
      const folderId =
        folder.id ||
        ("_ref_id" in folder ? folder._ref_id : undefined) ||
        `folder-${folderIndex}`

      let thisFolderPath: string
      const pathSegment = isTeamCollection ? folderId : folderIndex.toString()

      if (baseCollectionPath) {
        thisFolderPath = currentFolderPath
          ? `${baseCollectionPath}/${currentFolderPath}/${pathSegment}`
          : `${baseCollectionPath}/${pathSegment}`
      } else {
        thisFolderPath = currentFolderPath
          ? `${currentFolderPath}/${pathSegment}`
          : `${pathSegment}`
      }

      // Add folder
      items.push({
        type: "folder",
        item: folder,
        parentPath,
        id: folderId,
        pathOrID: thisFolderPath,
        requestIndex: null,
        requestID: null,
      })

      processedCount++

      // Process folder requests in batches
      if (folder.requests?.length) {
        for (let i = 0; i < folder.requests.length; i += BATCH_SIZE) {
          const batchEnd = Math.min(i + BATCH_SIZE, folder.requests.length)

          for (let j = i; j < batchEnd; j++) {
            const request = folder.requests[j]
            const requestId =
              request.id ||
              ("_ref_id" in request ? request._ref_id : undefined) ||
              `${folderId}-request-${j}`

            items.push({
              type: "request",
              item: request as HoppRESTRequest,
              parentPath: parentPath
                ? `${parentPath} / ${folder.name}`
                : folder.name,
              id: requestId,
              folderPath: thisFolderPath,
              requestIndex: j,
              requestID: request.id,
            })

            processedCount++
          }

          await updateProgress()
        }
      }

      // Process nested folders
      if (folder.folders?.length) {
        const newParentPath: string = parentPath
          ? `${parentPath} / ${folder.name}`
          : folder.name

        const relativeFolderPath = currentFolderPath
          ? `${currentFolderPath}/${pathSegment}`
          : `${pathSegment}`

        await processFoldersAsync(
          folder.folders,
          newParentPath,
          relativeFolderPath
        )
      }

      // Update progress less frequently
      if (folderIndex % 5 === 0) {
        await updateProgress()
      }
    }
  }

  if (collection.folders?.length) {
    await processFoldersAsync(collection.folders)
  }

  // Process collection requests in larger batches
  if (collection.requests?.length) {
    for (let i = 0; i < collection.requests.length; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, collection.requests.length)

      for (let j = i; j < batchEnd; j++) {
        const request = collection.requests[j]
        const requestId =
          request.id ||
          ("_ref_id" in request ? request._ref_id : undefined) ||
          `request-${j}`

        items.push({
          type: "request",
          item: request as HoppRESTRequest,
          parentPath: collection?.name || "",
          id: requestId,
          folderPath: baseCollectionPath,
          requestIndex: j,
          requestID: request.id,
        })

        processedCount++
      }

      await updateProgress()
    }
  }

  // Send final progress update
  await updateProgress(true)

  return items
}

self.addEventListener(
  "message",
  async (event: MessageEvent<IncomingDocumentationWorkerMessage>) => {
    const {
      type,
      collection: collectionString,
      pathOrID,
      isTeamCollection,
    } = event.data

    if (type === "GATHER_DOCUMENTATION") {
      try {
        // Parse the stringified collection
        const collection = JSON.parse(collectionString) as HoppCollection

        const items = await gatherAllItems(
          collection,
          pathOrID,
          isTeamCollection || false
        )

        const result: DocumentationResultMessage = {
          type: "DOCUMENTATION_RESULT",
          items: JSON.stringify(items), // Stringify the result for cloning
        }
        self.postMessage(result)
      } catch (error) {
        const err: DocumentationErrorMessage = {
          type: "DOCUMENTATION_ERROR",
          error: error instanceof Error ? error.message : String(error),
        }
        self.postMessage(err)
      }
    }
  }
)
