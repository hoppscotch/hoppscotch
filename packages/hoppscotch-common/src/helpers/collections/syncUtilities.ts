import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { transformCollectionForBackend } from "./sync"

/**
 * Common sync utilities for collection operations across platforms
 */

export type BulkImportFunction = (
  jsonString: string,
  reqType: any,
  parentCollectionID?: string
) => Promise<E.Either<any, any>>

export interface SyncContext {
  importUserCollectionsFromJSON: BulkImportFunction
  recursivelySyncCollections: (
    collection: HoppCollection,
    path: string,
    parentID?: string
  ) => Promise<void>
  collectionStore: any
  reqType: any
}

/**
 * Generic appendCollections implementation that can be used across platforms
 * This reduces code duplication by providing a common implementation
 */
export const createAppendCollectionsHandler = (context: SyncContext) => {
  return async ({ entries }: { entries: HoppCollection[] }) => {
    if (entries.length === 0) return

    // Transform collections to backend format
    const transformedCollections = entries.map(transformCollectionForBackend)

    // Use bulk import API for better performance
    const result = await context.importUserCollectionsFromJSON(
      JSON.stringify(transformedCollections),
      context.reqType,
      undefined // parentCollectionID is undefined for root collections
    )

    if (E.isLeft(result)) {
      console.error("Failed to append collections:", result.left)
      // Fallback to individual creation if bulk import fails
      let indexStart =
        context.collectionStore.value.state.length - entries.length

      entries.forEach((collection) => {
        context.recursivelySyncCollections(collection, `${indexStart}`)
        indexStart++
      })
    }
  }
}

/**
 * Creates a standardized collection data serialization function
 */
export const createCollectionDataSerializer = () => {
  return (collection: Partial<HoppCollection>) => {
    const data = {
      auth: collection.auth,
      headers: collection.headers,
      variables: collection.variables,
      _ref_id: collection._ref_id,
    }
    return JSON.stringify(data)
  }
}

// Re-export from the main sync utilities
export {
  transformCollectionForBackend,
  transformCollectionsForBulkImport,
  createCollectionData,
} from "./sync"
