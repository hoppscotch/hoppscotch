import { ReqType } from "@hoppscotch/common/helpers/backend/graphql"
import {
  appendGraphqlCollections,
  appendRESTCollections,
} from "@hoppscotch/common/newstore/collections"
import { HoppCollection } from "@hoppscotch/data"
import { runDispatchWithOutSyncing } from "@lib/sync"
import * as E from "fp-ts/Either"
import {
  exportedCollectionToHoppCollection,
  ExportedUserCollectionGQL,
  ExportedUserCollectionREST,
} from "../desktop"
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
  } catch (e) {
    console.log("Import to backend encountered an error", e)
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

async function loadImportedUserCollections(
  collectionsJSONString: string,
  collectionType: "REST" | "GQL"
) {
  const importedCollections = (
    JSON.parse(collectionsJSONString) as Array<
      ExportedUserCollectionGQL | ExportedUserCollectionREST
    >
  ).map((collection) => ({ v: 1, ...collection }))
  runDispatchWithOutSyncing(() => {
    collectionType == "REST"
      ? appendRESTCollections(
          importedCollections.map(
            (collection) =>
              exportedCollectionToHoppCollection(
                collection,
                "REST"
              ) as HoppCollection
          )
        )
      : appendGraphqlCollections(
          importedCollections.map(
            (collection) =>
              exportedCollectionToHoppCollection(
                collection,
                "GQL"
              ) as HoppCollection
          )
        )
  })
}
