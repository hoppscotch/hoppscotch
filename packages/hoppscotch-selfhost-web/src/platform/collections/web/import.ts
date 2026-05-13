import { ReqType } from "@hoppscotch/common/helpers/backend/graphql"
import {
  appendGraphqlCollections,
  appendRESTCollections,
} from "@hoppscotch/common/newstore/collections"
import { generateUniqueRefId, HoppCollection } from "@hoppscotch/data"
import {
  ensureRefIds,
  indexCollectionsByRefId,
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
 * Platform-specific import for selfhost-web. Caller (`components/collections/
 * ImportExport.vue`) must have run `ensureRefIds` + `populateLocalStoresFromCollectionTree`
 * upstream — we re-stamp ref-ids defensively. We never populate from the
 * stripped wire payload (raw values are gone by then), but on backend
 * success we re-seed local stores from the original (pre-strip) tree
 * paired to the loaded tree by `_ref_id` via `repopulateLoadedCollectionTree`.
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

      // Warn once per import if any loaded root lacks `_ref_id` — likely a
      // backend that dropped `data._ref_id` from the blob round-trip.
      // Secret values for those nodes silently won't surface after reload.
      if (loaded.some((c) => !c._ref_id)) {
        console.warn(
          "[importToPersonalWorkspace] loaded collection(s) missing `_ref_id`; " +
            "imported secret values may not persist across reload"
        )
      }

      loaded.forEach((loadedColl) => {
        repopulateLoadedCollectionTree(loadedColl, originalsByRefId)
      })

      return E.right({ success: true })
    }
    // Backend failed — raw values still live in local stores by `_ref_id`.
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
