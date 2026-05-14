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
            // Symmetric with non-secrets below: `??` (not `||`) so an
            // explicit `""` currentValue is preserved — a deliberate
            // user clear must not be resurrected from `initialValue` on
            // rehydration. Fallback only kicks in when `currentValue` is
            // nullish (e.g. legacy `hoppEnv` import without the field).
            // Confirmed importers (Postman/Insomnia/hopp v2 migration)
            // already set both fields, so the fallback never fires for
            // them anyway.
            value: v.currentValue ?? v.initialValue ?? "",
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

/**
 * Foreign-collection-import convention: `postman.ts` and
 * `insomnia/insomniaColl.ts` put the secret in `initialValue` with
 * `currentValue: ""` (so the wire payload stays clean). Promote so the secret
 * service stores the imported value. Env importers set both fields and call
 * `populateLocalStoresFromVariables` directly — they bypass this step, as
 * does the global-env rehydration path (which must preserve user clears).
 * Idempotent — promoted entries are unchanged on a second pass.
 */
const promoteSecretInitialValueForCollection = (
  variables: readonly SecretCapableVariable[]
): SecretCapableVariable[] =>
  variables.map((v) =>
    v.secret && !v.currentValue && v.initialValue
      ? { ...v, currentValue: v.initialValue }
      : v
  )

export const populateLocalStoresFromCollectionTree = (
  collection: HoppCollection
) => {
  if (collection._ref_id) {
    populateLocalStoresFromVariables(
      collection._ref_id,
      promoteSecretInitialValueForCollection(collection.variables ?? [])
    )
  } else {
    // All current callers run `ensureRefIds` upstream so this should be
    // unreachable; the warn exists so a future caller that skips it is
    // debuggable instead of silently dropping secret values.
    console.warn(
      "[populateLocalStoresFromCollectionTree] collection has no `_ref_id`; secret values will not be persisted locally",
      collection.name
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
      // Same promote as `populateLocalStoresFromCollectionTree` — `original`
      // is the pre-strip input tree, which for Postman/Insomnia imports
      // still carries the secret in `initialValue` with `currentValue: ""`.
      populateLocalStoresFromVariables(
        loaded._ref_id,
        promoteSecretInitialValueForCollection(original.variables ?? [])
      )
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

/**
 * Flush local-store entries keyed by `_ref_id`s in `tree` that aren't
 * present in `keptRefIds`. Used after `repopulateLoadedCollectionTree`
 * to clean up orphans on old SH backends that drop the `data._ref_id`
 * round-trip — upstream populate seeded entries under originals' refIds
 * that the loaded tree (with fresh UUIDs) can't reach.
 */
export const flushUnmatchedRefIdsFromTree = (
  tree: HoppCollection[],
  keptRefIds: ReadonlySet<string>
) => {
  const secretEnvironmentService = getService(SecretEnvironmentService)
  const currentEnvironmentValueService = getService(CurrentValueService)

  const walk = (nodes: HoppCollection[]) => {
    nodes.forEach((node) => {
      if (node._ref_id && !keptRefIds.has(node._ref_id)) {
        secretEnvironmentService.deleteSecretEnvironment(node._ref_id)
        currentEnvironmentValueService.deleteEnvironment(node._ref_id)
      }
      walk(node.folders ?? [])
    })
  }
  walk(tree)
}

/**
 * Recursive flush for a team-collection subtree. Walks `children` (not
 * `folders` — different shape from `HoppCollection`) and deletes each
 * descendant's secret/current entries by backend `id`. Without this,
 * deleting a team collection leaves nested folders' secrets orphaned in
 * the secret service.
 */
type TeamCollectionNode = {
  id: string
  children: TeamCollectionNode[] | null | undefined
}

export const flushLocalStoresForTeamCollectionTree = (
  collection: TeamCollectionNode
) => {
  const secretEnvironmentService = getService(SecretEnvironmentService)
  const currentEnvironmentValueService = getService(CurrentValueService)

  const walk = (node: TeamCollectionNode) => {
    secretEnvironmentService.deleteSecretEnvironment(node.id)
    currentEnvironmentValueService.deleteEnvironment(node.id)
    ;(node.children ?? []).forEach(walk)
  }
  walk(collection)
}
