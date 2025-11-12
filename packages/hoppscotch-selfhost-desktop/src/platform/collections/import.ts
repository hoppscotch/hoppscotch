import {
  appendGraphqlCollections,
  appendRESTCollections,
  setGraphqlCollections,
  setRESTCollections,
} from "@hoppscotch/common/newstore/collections"
import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { fetchAndConvertUserCollections } from "./mutations"
import { ReqType } from "@hoppscotch/common/helpers/backend/graphql"
import { importUserCollectionsFromJSON } from "./collections.api"

/**
 * Platform-specific import function for selfhost-web that uses the correct nested collection queries
 */
export const importToPersonalWorkspace = async (
  collections: HoppCollection[],
  reqType: ReqType
) => {
  console.log("Importing collections to personal workspace via backend")
  try {
    const transformedCollection = collections.map((collection) =>
      translateToPersonalCollectionFormat(collection)
    )

    console.log("Transformed collections for import:", transformedCollection)

    const res = await importUserCollectionsFromJSON(
      JSON.stringify(transformedCollection),
      reqType
    )

    console.log("Import to backend response:", res)

    if (E.isRight(res)) {
      console.log("Import to backend succeeded:", res.right)
      // Backend import succeeded, now fetch and persist collections in store
      const fetchResult = await fetchAndConvertUserCollections(reqType)

      if (E.isRight(fetchResult)) {
        console.log("Fetch after import succeeded:", fetchResult.right)
        // Replace local collections with backend collections
        if (reqType === ReqType.Rest) {
          setRESTCollections(fetchResult.right)
        } else {
          setGraphqlCollections(fetchResult.right)
        }
      } else {
        console.log("Fetch after import failed:", fetchResult.left)
        // Failed to fetch, append to local store as fallback
        return appendCollectionsToStore(collections, reqType)
      }

      return E.right({ success: true })
    }
    // Backend import failed, fall back to local storage
    return appendCollectionsToStore(collections, reqType)
  } catch {
    console.log("Import to backend encountered an error")
    // On any error, fall back to local storage
    return appendCollectionsToStore(collections, reqType)
  }
}

const appendCollectionsToStore = (
  collections: HoppCollection[],
  reqType: ReqType
) => {
  if (reqType === ReqType.Rest) {
    appendRESTCollections(collections)
  } else {
    appendGraphqlCollections(collections)
  }
  return E.right({ success: true })
}

function translateToPersonalCollectionFormat(x: HoppCollection) {
  const folders: HoppCollection[] = (x.folders ?? []).map(
    translateToPersonalCollectionFormat
  )

  const data = {
    auth: x.auth,
    headers: x.headers,
    variables: x.variables,
  }

  const obj = {
    ...x,
    folders,
    data,
  }

  return obj
}
