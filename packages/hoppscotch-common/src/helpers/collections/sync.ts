import { HoppCollection } from "@hoppscotch/data"

/**
 * Transforms a HoppCollection to the backend format expected by importUserCollectionsFromJSON
 * This includes serializing collection properties (auth, headers, variables) into a data field
 */
export const transformCollectionForBackend = (
  collection: HoppCollection
): any => {
  const data = {
    auth: collection.auth ?? {
      authType: "inherit",
      authActive: true,
    },
    headers: collection.headers ?? [],
    variables: collection.variables ?? [],
    _ref_id: collection._ref_id,
  }

  return {
    name: collection.name,
    data: JSON.stringify(data),
    folders: collection.folders.map(transformCollectionForBackend),
    requests: collection.requests,
  }
}

/**
 * Transforms an array of HoppCollections to the backend format for bulk import
 */
export const transformCollectionsForBulkImport = (
  collections: HoppCollection[]
): any[] => {
  return collections.map(transformCollectionForBackend)
}

/**
 * Creates collection data object with default values for individual collection creation
 */
export const createCollectionData = (collection: HoppCollection): string => {
  const data = {
    auth: collection.auth ?? {
      authType: "inherit",
      authActive: true,
    },
    headers: collection.headers ?? [],
    variables: collection.variables ?? [],
    _ref_id: collection._ref_id,
  }
  return JSON.stringify(data)
}
