import { ReqType } from "@hoppscotch/common/helpers/backend/graphql"
import {
  appendGraphqlCollections,
  appendRESTCollections,
} from "@hoppscotch/common/newstore/collections"
import { generateUniqueRefId, HoppCollection } from "@hoppscotch/data"
import {
  ensureRefIds,
  flushUnmatchedRefIdsFromTree,
  indexCollectionsByRefId,
  populateLocalStoresFromCollectionTree,
  repopulateLoadedCollectionTree,
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
 * Platform-specific import for selfhost-web. Self-contained — re-stamps
 * ref-ids and repopulates local stores on both backend success (via
 * `repopulateLoadedCollectionTree`, paired by `_ref_id`) and failure;
 * never from the stripped wire payload (raw values are gone by then).
 * The Vue caller normally pre-runs `ensureRefIds` +
 * `populateLocalStoresFromCollectionTree` upstream too; the overlap is
 * intentional defense-in-depth, not a caller contract.
 */
export const importToPersonalWorkspace = async (
  collections: HoppCollection[],
  reqType: ReqType
) => {
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

      // Backstop populate: pair loaded → original by `_ref_id` (round-tripped
      // via `data._ref_id`), not by index — backend may reorder. Canonical
      // populate already ran upstream; missing ref-ids are skipped.
      const originalsByRefId = new Map<string, HoppCollection>()
      indexCollectionsByRefId(collectionsWithRefIds, originalsByRefId)

      // Warn once per import if any loaded root's `_ref_id` doesn't match
      // an original — `exportedCollectionToHoppCollection` backfills
      // missing ref-ids with fresh UUIDs, so we can't detect the
      // round-trip failure via a null check. The miss-against-originals
      // check catches both "backend dropped `data._ref_id`" and "backend
      // returned a value we never sent."
      if (loaded.some((c) => !c._ref_id || !originalsByRefId.has(c._ref_id))) {
        console.warn(
          "[importToPersonalWorkspace] loaded collection(s) don't pair to " +
            "originals by `_ref_id`; imported secret values may not persist " +
            "across reload"
        )
      }

      loaded.forEach((loadedColl) => {
        repopulateLoadedCollectionTree(loadedColl, originalsByRefId)
      })

      // Flush orphans left under originals' refIds when the backend dropped
      // `data._ref_id` for some nodes — their entries would otherwise
      // accumulate in localStorage unreachable from the loaded tree. Runs
      // AFTER `repopulateLoadedCollectionTree` so paired entries (re-seeded
      // under their refIds) aren't deleted.
      const loadedRefIds = new Set<string>()
      const collectRefIds = (cs: HoppCollection[]) => {
        cs.forEach((c) => {
          if (c._ref_id) loadedRefIds.add(c._ref_id)
          collectRefIds(c.folders ?? [])
        })
      }
      collectRefIds(loaded)
      flushUnmatchedRefIdsFromTree(collectionsWithRefIds, loadedRefIds)

      return E.right({ success: true })
    }
    // Backend failed — defensively populate local stores from the raw
    // (pre-strip) tree before appending the stripped tree to newstore.
    // The canonical caller already populated upstream, so this is
    // idempotent in the normal flow; it exists so a future caller that
    // forgets the upstream populate doesn't silently lose secrets on
    // backend failure.
    collectionsWithRefIds.forEach(populateLocalStoresFromCollectionTree)
    return appendCollectionsToStore(
      collectionsWithRefIds.map(stripCollectionTreeForStore),
      reqType
    )
  } catch {
    collectionsWithRefIds.forEach(populateLocalStoresFromCollectionTree)
    return appendCollectionsToStore(
      collectionsWithRefIds.map(stripCollectionTreeForStore),
      reqType
    )
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

/**
 * Strip + reshape for the personal-workspace import wire payload.
 *
 * Does NOT populate local stores — the caller is responsible (see
 * `importToPersonalWorkspace`'s contract).
 */
export function translateToPersonalCollectionFormat(x: HoppCollection) {
  const refId = x._ref_id ?? generateUniqueRefId("coll")

  const folders: HoppCollection[] = (x.folders ?? []).map(
    translateToPersonalCollectionFormat
  )

  const data: CollectionDataProps = {
    auth: x.auth,
    headers: x.headers,
    variables: stripSecretVariableValuesForWire(x.variables ?? []),
    // Lives inside `data` so it round-trips the backend — the top-level
    // `_ref_id` on the wire is dropped, only `data._ref_id` is echoed back.
    _ref_id: refId,
    description: x.description ?? null,
    preRequestScript: x.preRequestScript ?? "",
    testScript: x.testScript ?? "",
  }

  return {
    ...x,
    // Override the spread's top-level `variables` with the stripped copy
    // — without this, the raw secret values would still travel in the
    // HTTP body even though the backend only reads `data.variables`.
    // Reuses `data.variables` so we don't strip twice.
    variables: data.variables,
    folders,
    data,
  }
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

  // NOTE: backend-returned objects whose variables have already been stripped
  // (initialValue/currentValue cleared for secrets). Returned so callers can
  // pair them back to originals by `_ref_id` for repopulation — do NOT pass
  // these as the source of secret values.
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
