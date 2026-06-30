import { generateUniqueRefId, HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { ReqType } from "~/helpers/backend/graphql"
import { CollectionDataProps } from "~/helpers/backend/helpers"
import {
  ensureRefIds,
  flushUnmatchedRefIdsFromTree,
  indexCollectionsByRefId,
  populateLocalStoresFromCollectionTree,
  repopulateLoadedCollectionTree,
  stripCollectionTreeForStore,
  stripSecretVariableValuesForWire,
} from "~/helpers/secretVariables"
import {
  appendGraphqlCollections,
  appendRESTCollections,
} from "~/newstore/collections"
import {
  exportedCollectionToHoppCollection,
  ExportedUserCollectionGQL,
  ExportedUserCollectionREST,
} from "."
import { runDispatchWithOutSyncing } from ".."
import { importUserCollectionsFromJSON } from "./api"

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

      // Collect ALL loaded ref-ids (root + nested folders) so the warning
      // and the flush both detect nested-level round-trip failures —
      // `exportedCollectionToHoppCollection` backfills missing
      // `data._ref_id` with fresh UUIDs, so a root-only check would miss
      // a buggy backend that dropped `_ref_id` for nested folders.
      const loadedRefIds = new Set<string>()
      const collectRefIds = (cs: HoppCollection[]) => {
        cs.forEach((c) => {
          if (c._ref_id) loadedRefIds.add(c._ref_id)
          collectRefIds(c.folders ?? [])
        })
      }
      collectRefIds(loaded)

      let unpairedCount = 0
      const countUnpaired = (cs: HoppCollection[]) => {
        cs.forEach((c) => {
          if (c._ref_id && !loadedRefIds.has(c._ref_id)) unpairedCount++
          countUnpaired(c.folders ?? [])
        })
      }
      countUnpaired(collectionsWithRefIds)

      if (unpairedCount > 0) {
        console.warn(
          `[importToPersonalWorkspace] ${unpairedCount} collection node(s) ` +
            `did not pair to originals by \`_ref_id\` (backend likely dropped ` +
            `\`data._ref_id\` at those levels); imported secret values for ` +
            `those nodes will not persist and need to be re-entered.`
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
      flushUnmatchedRefIdsFromTree(collectionsWithRefIds, loadedRefIds)

      return E.right({ success: true })
    }
    // Backend failed — defensively populate local stores from the raw
    // (pre-strip) tree before appending the stripped tree to newstore.
    // The canonical caller already populated upstream, so this is
    // idempotent in the normal flow; it exists so a future caller that
    // forgets the upstream populate doesn't silently lose secrets on
    // backend failure.
    return appendImportedCollectionsLocally(collectionsWithRefIds, reqType)
  } catch {
    return appendImportedCollectionsLocally(collectionsWithRefIds, reqType)
  }
}

/**
 * Local-only append used by the backend-failure fallback. The store
 * dispatch is suppressed via `runDispatchWithOutSyncing` so it does NOT
 * re-enter the unified `appendCollections` store-sync (which would fire a
 * second `importUserCollectionsFromJSON` for an import the backend already
 * rejected — see the double-trigger this guards against).
 */
function appendImportedCollectionsLocally(
  collections: HoppCollection[],
  reqType: ReqType
) {
  collections.forEach(populateLocalStoresFromCollectionTree)
  runDispatchWithOutSyncing(() =>
    appendCollectionsToStore(
      collections.map(stripCollectionTreeForStore),
      reqType
    )
  )
  return E.right({ success: true })
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
    // Carry the resolved `refId` at top level too (not just inside `data`)
    // so the post-translation object is internally consistent even when
    // `x._ref_id` was missing on the input. Wire-irrelevant — backend
    // only reads `data._ref_id` — but matches the invariant other code
    // expects of a `HoppCollection`.
    _ref_id: refId,
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
