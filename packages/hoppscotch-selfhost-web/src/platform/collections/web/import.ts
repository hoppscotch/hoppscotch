import { ReqType } from "@hoppscotch/common/helpers/backend/graphql"
import {
  appendGraphqlCollections,
  appendRESTCollections,
} from "@hoppscotch/common/newstore/collections"
import { generateUniqueRefId, HoppCollection } from "@hoppscotch/data"
import {
  populateLocalStoresFromVariables,
  stripSecretVariableValuesForWire,
} from "@hoppscotch/common/helpers/secretVariables"
import * as E from "fp-ts/Either"
import {
  exportedCollectionToHoppCollection,
  ExportedUserCollectionGQL,
  ExportedUserCollectionREST,
} from "../web"
import { importUserCollectionsFromJSON } from "./api"
import { runDispatchWithOutSyncing } from "@app/lib/sync"

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

export const appendCollectionsToStore = (
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

export function translateToPersonalCollectionFormat(x: HoppCollection) {
  // Generate a `_ref_id` if missing — collections from local/non-synced
  // workspaces may arrive without one, and we need a stable key for the
  // local secret store both before and after the backend round-trip.
  const refId = x._ref_id ?? generateUniqueRefId("coll")

  // Save the user's secret + currentValue inputs into the local stores BEFORE
  // they're stripped from the wire payload. Without this, the user loses
  // their imported secrets on the next backend round-trip (the synced row
  // overwrites local newstore via `setRESTCollections`).
  populateLocalStoresFromVariables(refId, x.variables ?? [])

  const folders: HoppCollection[] = (x.folders ?? []).map(
    translateToPersonalCollectionFormat
  )

  const data = {
    auth: x.auth,
    headers: x.headers,
    variables: stripSecretVariableValuesForWire(x.variables ?? []),
    _ref_id: refId,
    description: x.description,
    preRequestScript: x.preRequestScript ?? "",
    testScript: x.testScript ?? "",
  }

  // `_ref_id` lives inside `data` (which the backend persists and echoes
  // back); the top-level field on the wire is ignored, so we don't write it
  // here.
  const obj = {
    ...x,
    folders,
    data,
  }

  return obj
}

export async function loadImportedUserCollections(
  collectionsJSONString: string,
  collectionType: "REST" | "GQL"
) {
  const importedCollections = (
    JSON.parse(collectionsJSONString) as Array<
      ExportedUserCollectionGQL | ExportedUserCollectionREST
    >
  ).map((collection) => ({ v: 1, ...collection }))
  runDispatchWithOutSyncing(() => {
    collectionType === "REST"
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
