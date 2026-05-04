import { ReqType } from "@hoppscotch/common/helpers/backend/graphql"
import {
  appendGraphqlCollections,
  appendRESTCollections,
} from "@hoppscotch/common/newstore/collections"
import { generateUniqueRefId, HoppCollection } from "@hoppscotch/data"
import {
  ensureRefIds,
  populateLocalStoresFromCollectionTree,
  populateLocalStoresFromVariables,
  stripCollectionTreeForStore,
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
  // Stamp every node with a stable `_ref_id` and populate local stores
  // BEFORE the wire-strip runs. This way the secret values are
  // addressable by ref-id whether we end up taking the backend-success
  // path or the local-fallback path below — the orphaned-secrets bug
  // (local store keyed under temp ref-ids that the fallback's
  // collections didn't carry) is impossible by construction.
  const collectionsWithRefIds = collections.map(ensureRefIds)
  collectionsWithRefIds.forEach(populateLocalStoresFromCollectionTree)

  try {
    const transformedCollection = collectionsWithRefIds.map((collection) =>
      translateToPersonalCollectionFormat(collection)
    )

    const res = await importUserCollectionsFromJSON(
      JSON.stringify(transformedCollection),
      reqType
    )

    if (E.isRight(res)) {
      const loaded = await loadImportedUserCollections(
        res.right.importUserCollectionsFromJSON.exportedCollection,
        res.right.importUserCollectionsFromJSON.collectionType === "REST"
          ? "REST"
          : "GQL"
      )

      // Defensive re-populate: pair the post-load collections (which
      // carry the backend-assigned IDs and whatever `_ref_id` survived
      // the round-trip) with the originals (which retain raw secret
      // values), walked in parallel by index. If `data._ref_id`
      // round-tripped cleanly the keys match the pre-walk populate
      // (idempotent replace); if for any reason the round-trip dropped
      // or rewrote `_ref_id`, this re-keys the local secret store
      // under the loaded collection's actual `_ref_id`.
      loaded.forEach((loadedColl, i) => {
        const original = collectionsWithRefIds[i]
        if (original) {
          repopulateLoadedCollectionTree(loadedColl, original)
        }
      })

      return E.right({ success: true })
    }
    // Backend import failed — append a stripped tree to newstore so raw
    // secret values don't sit in the store / localStorage / future sync
    // payloads. Raw values remain in the local secret + currentValue
    // stores, keyed by the same `_ref_id`s populated above.
    return appendCollectionsToStore(
      collectionsWithRefIds.map(stripCollectionTreeForStore),
      reqType
    )
  } catch {
    return appendCollectionsToStore(
      collectionsWithRefIds.map(stripCollectionTreeForStore),
      reqType
    )
  }
}

const repopulateLoadedCollectionTree = (
  loaded: HoppCollection,
  original: HoppCollection
) => {
  if (loaded._ref_id) {
    populateLocalStoresFromVariables(loaded._ref_id, original.variables ?? [])
  }
  ;(loaded.folders ?? []).forEach((loadedFolder, i) => {
    const originalFolder = original.folders?.[i]
    if (originalFolder) {
      repopulateLoadedCollectionTree(loadedFolder, originalFolder)
    }
  })
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
): Promise<HoppCollection[]> {
  const importedCollections = (
    JSON.parse(collectionsJSONString) as Array<
      ExportedUserCollectionGQL | ExportedUserCollectionREST
    >
  ).map((collection) => ({ v: 1, ...collection }))

  const hoppCollections = importedCollections.map(
    (collection) =>
      exportedCollectionToHoppCollection(
        collection,
        collectionType
      ) as HoppCollection
  )

  runDispatchWithOutSyncing(() => {
    if (collectionType === "REST") {
      appendRESTCollections(hoppCollections)
    } else {
      appendGraphqlCollections(hoppCollections)
    }
  })

  return hoppCollections
}
