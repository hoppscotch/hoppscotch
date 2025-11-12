import { ReqType } from "@hoppscotch/common/helpers/backend/graphql"
import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import {
  appendCollectionsToStore,
  loadImportedUserCollections,
  translateToPersonalCollectionFormat,
} from "../web/import"
import { importUserCollectionsFromJSON } from "./api"

/**
 * Platform-specific import function for selfhost-web that uses the correct nested collection queries
 */
export const importToPersonalWorkspace = async (
  collections: HoppCollection[],
  reqType: ReqType
) => {
  try {
    const transformedCollection = collections.map((collection) =>
      translateToPersonalCollectionFormat(collection)
    )

    const res = await importUserCollectionsFromJSON(
      JSON.stringify(transformedCollection),
      reqType
    )

    if (E.isRight(res)) {
      await loadImportedUserCollections(
        res.right.importUserCollectionsFromJSON.exportedCollection,
        res.right.importUserCollectionsFromJSON.collectionType === "REST"
          ? "REST"
          : "GQL"
      )
      return E.right({ success: true })
    }
    // Backend import failed, fall back to local storage
    return appendCollectionsToStore(collections, reqType)
  } catch {
    // On any error, fall back to local storage
    return appendCollectionsToStore(collections, reqType)
  }
}
