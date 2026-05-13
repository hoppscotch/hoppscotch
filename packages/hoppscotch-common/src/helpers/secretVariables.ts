import { generateUniqueRefId, type HoppCollection } from "@hoppscotch/data"

import { getService } from "../modules/dioc"
import { CurrentValueService } from "../services/current-environment-value.service"
import { SecretEnvironmentService } from "../services/secret-environment.service"

/** Shape shared by collection and environment variables. */
type SecretCapableVariable = {
  key: string
  initialValue: string
  currentValue: string
  secret: boolean
}

/**
 * Clear `initialValue` for secrets and `currentValue` for all variables
 * before the wire write. Raw values live only in the local secret store.
 */
export const stripSecretVariableValuesForWire = <
  T extends SecretCapableVariable,
>(
  variables: T[]
): T[] =>
  variables.map((v) => ({
    ...v,
    initialValue: v.secret ? "" : v.initialValue,
    currentValue: "",
  }))

/**
 * Seed the local secret + currentValue stores from raw variables.
 *
 * IMPORTANT: pass RAW (pre-strip) inputs. A stripped variable has empty
 * `initialValue` / `currentValue` and will persist as blank.
 */
export const populateLocalStoresFromVariables = (
  entityId: string,
  variables: readonly SecretCapableVariable[]
) => {
  if (!entityId) return

  const secretEnvironmentService = getService(SecretEnvironmentService)
  const currentEnvironmentValueService = getService(CurrentValueService)

  const secrets = variables.flatMap((v, index) =>
    v.secret
      ? [
          {
            key: v.key,
            // Fall back to `initialValue` when `currentValue` is empty —
            // a fresh JSON-import carries the secret in `initialValue`
            // with `currentValue` blanked by the wire/export strip.
            // Without the fallback the UI would render blank immediately
            // after import even though the value was in the file.
            value: v.currentValue || v.initialValue || "",
            initialValue: v.initialValue ?? "",
            varIndex: index,
          },
        ]
      : []
  )

  const nonSecrets = variables.flatMap((v, index) =>
    !v.secret
      ? [
          {
            key: v.key,
            // Fall back to `initialValue` ONLY when `currentValue` is
            // absent — `""` is a meaningful "user cleared this" value
            // and must be preserved.
            currentValue: v.currentValue ?? v.initialValue ?? "",
            varIndex: index,
            isSecret: false as const,
          },
        ]
      : []
  )

  secretEnvironmentService.addSecretEnvironment(entityId, secrets)
  currentEnvironmentValueService.addEnvironment(entityId, nonSecrets)
}

export const populateLocalStoresFromCollectionTree = (
  collection: HoppCollection
) => {
  if (collection._ref_id) {
    populateLocalStoresFromVariables(
      collection._ref_id,
      collection.variables ?? []
    )
  }
  ;(collection.folders ?? []).forEach(populateLocalStoresFromCollectionTree)
}

/** Fresh node objects + `folders` arrays; other fields alias the input. */
export const ensureRefIds = (collection: HoppCollection): HoppCollection => ({
  ...collection,
  _ref_id: collection._ref_id ?? generateUniqueRefId("coll"),
  folders: (collection.folders ?? []).map(ensureRefIds),
})

/** Reallocates `variables` and `folders`; other fields alias the input. */
export const stripCollectionTreeForStore = (
  collection: HoppCollection
): HoppCollection => ({
  ...collection,
  variables: stripSecretVariableValuesForWire(collection.variables ?? []),
  folders: (collection.folders ?? []).map(stripCollectionTreeForStore),
})

/** Flat `_ref_id → collection` index across a tree. Mutates `out`. */
export const indexCollectionsByRefId = (
  collections: HoppCollection[],
  out: Map<string, HoppCollection>
) => {
  collections.forEach((c) => {
    if (c._ref_id) out.set(c._ref_id, c)
    if (c.folders?.length) indexCollectionsByRefId(c.folders, out)
  })
}

/**
 * Re-seed local stores after bulk-import using `_ref_id` (round-tripped
 * via `data._ref_id`) instead of array index — backend may reorder.
 */
export const repopulateLoadedCollectionTree = (
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

/**
 * Flush every node's local-store entries on delete. Flushes by both
 * `_ref_id` (personal) and `id` (team); services no-op on missing keys.
 */
export const flushLocalStoresForCollectionTree = (
  collection: HoppCollection
) => {
  const secretEnvironmentService = getService(SecretEnvironmentService)
  const currentEnvironmentValueService = getService(CurrentValueService)

  const walk = (node: HoppCollection) => {
    if (node._ref_id) {
      secretEnvironmentService.deleteSecretEnvironment(node._ref_id)
      currentEnvironmentValueService.deleteEnvironment(node._ref_id)
    }
    if (node.id) {
      secretEnvironmentService.deleteSecretEnvironment(node.id)
      currentEnvironmentValueService.deleteEnvironment(node.id)
    }
    ;(node.folders ?? []).forEach(walk)
  }
  walk(collection)
}
