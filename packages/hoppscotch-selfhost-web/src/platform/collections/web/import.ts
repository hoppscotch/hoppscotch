import { ReqType } from "@hoppscotch/common/helpers/backend/graphql"
import {
  appendGraphqlCollections,
  appendRESTCollections,
} from "@hoppscotch/common/newstore/collections"
import { generateUniqueRefId, HoppCollection } from "@hoppscotch/data"
import {
  ensureRefIds,
  populateLocalStoresFromVariables,
  stripCollectionTreeForStore,
  stripSecretVariableValuesForWire,
} from "@hoppscotch/common/helpers/secretVariables"
import { CollectionDataProps } from "@hoppscotch/common/helpers/backend/helpers"
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
  // CONTRACT: the caller (`components/collections/ImportExport.vue`) is
  // expected to have already run `ensureRefIds` + `populateLocalStores
  // FromCollectionTree` over the input. We re-stamp ref-ids here as a
  // defensive idempotent backstop, but we DO NOT re-populate — the
  // raw secret/currentValue values aren't on the input variables array
  // at any later point in this function (the strip runs inside
  // `translateToPersonalCollectionFormat`), so a populate here would
  // either duplicate work or, if a future callsite forgets to populate
  // upstream, silently lose the values. Keeping the populate at exactly
  // one well-defined point avoids the implicit-ordering trap.
  const collectionsWithRefIds = collections.map(ensureRefIds)

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

      // Defensive re-populate: pair post-load collections with their
      // originals by `_ref_id` (not array index). The backend may
      // reorder collections during bulk import; matching by index
      // would re-key the wrong secret-store entry to the wrong
      // collection's variables. Pre-walk stamps `_ref_id` and the
      // `data._ref_id` blob round-trips it, so the pairing is stable
      // by ref-id. If a node's `_ref_id` is missing (backend dropped
      // it) the lookup returns no original and populate is skipped —
      // matching the prior behavior of the index-based path.
      const originalsByRefId = new Map<string, HoppCollection>()
      indexCollectionsByRefId(collectionsWithRefIds, originalsByRefId)
      loaded.forEach((loadedColl) => {
        repopulateLoadedCollectionTree(loadedColl, originalsByRefId)
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

// Builds a `_ref_id → original collection` index across the whole tree
// so the post-load re-populate can pair by stable ref-id instead of by
// array position (the backend can reorder).
const indexCollectionsByRefId = (
  collections: HoppCollection[],
  out: Map<string, HoppCollection>
) => {
  collections.forEach((c) => {
    if (c._ref_id) out.set(c._ref_id, c)
    if (c.folders?.length) indexCollectionsByRefId(c.folders, out)
  })
}

const repopulateLoadedCollectionTree = (
  loaded: HoppCollection,
  originalsByRefId: Map<string, HoppCollection>
) => {
  if (loaded._ref_id) {
    const original = originalsByRefId.get(loaded._ref_id)
    if (original) {
      populateLocalStoresFromVariables(loaded._ref_id, original.variables ?? [])
    }
  }
  ;(loaded.folders ?? []).forEach((loadedFolder) => {
    repopulateLoadedCollectionTree(loadedFolder, originalsByRefId)
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
  //
  // CONTRACT: this function does NOT populate the local secret /
  // currentValue stores. The caller MUST do that upstream before
  // invoking translate (see `components/collections/ImportExport.vue:
  // importToPersonalWorkspace` which calls
  // `populateLocalStoresFromCollectionTree` over the pre-walked tree).
  // Doing it here would duplicate the populate that the caller already
  // ran — and invite "implicit-ordering" hazards if the caller's data
  // ever differs from `x.variables` after the strip below.
  const refId = x._ref_id ?? generateUniqueRefId("coll")

  const folders: HoppCollection[] = (x.folders ?? []).map(
    translateToPersonalCollectionFormat
  )

  const data: CollectionDataProps = {
    auth: x.auth,
    headers: x.headers,
    variables: stripSecretVariableValuesForWire(x.variables ?? []),
    // Lives inside `data` so it round-trips the backend — the top-level
    // `_ref_id` on the wire is dropped, only `data._ref_id` is echoed
    // back. Without it, the local secret store keys orphan on next load.
    _ref_id: refId,
    description: x.description ?? null,
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
