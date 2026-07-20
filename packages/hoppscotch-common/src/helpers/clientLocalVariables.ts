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
 * Strip client-local values before a wire write (backend mutations, exports,
 * store documents): a secret's value lives only in `SecretEnvironmentService`
 * (#6279), and `currentValue` is a per-user override in `CurrentValueService`.
 * Both are persisted locally and resolve via the currentValue→initialValue
 * fallback, so only the non-secret `initialValue` — the shared default —
 * rides the wire.
 */
export const stripClientLocalValuesForWire = <T extends SecretCapableVariable>(
  variables: T[]
): T[] =>
  variables.map((v) => ({
    ...v,
    initialValue: v.secret ? "" : v.initialValue,
    currentValue: "",
  }))

/**
 * Seed the local secret + currentValue stores from RAW (pre-strip) variables —
 * stripped inputs would persist as blanks.
 *
 * `??` (not `||`) is load-bearing: on rehydration an explicit `""` means
 * "user deliberately cleared" and must not be resurrected from `initialValue`.
 * Import payloads (where `""` means "stripped on wire") are promoted upstream
 * by `promoteInitialValueForImport` — route new import paths through that
 * instead of changing this function.
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
 * Promote `initialValue` into an empty `currentValue` — the wire shape
 * produced by `stripClientLocalValuesForWire`, also the Postman / Insomnia
 * format. Idempotent. The global-env rehydration path skips this on purpose:
 * there `""` means "user deliberately cleared".
 */
export const promoteInitialValueForImport = (
  variables: readonly SecretCapableVariable[]
): SecretCapableVariable[] =>
  variables.map((v) =>
    !v.currentValue && v.initialValue
      ? { ...v, currentValue: v.initialValue }
      : v
  )

export const populateLocalStoresFromCollectionTree = (
  collection: HoppCollection
) => {
  if (collection._ref_id) {
    populateLocalStoresFromVariables(
      collection._ref_id,
      promoteInitialValueForImport(collection.variables ?? [])
    )
  } else {
    // Unreachable when callers run `ensureRefIds` upstream; warn so a
    // future caller that skips it is debuggable instead of silently
    // dropping secrets. (`repopulateLoadedCollectionTree` bypasses this
    // branch — its missing-ref-id gap is warned in selfhost-web's
    // `importToPersonalWorkspace`.)
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
  variables: stripClientLocalValuesForWire(collection.variables ?? []),
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
 * Re-seed local stores after bulk-import by `_ref_id` (round-tripped via
 * `data._ref_id` at every level) — the backend may reorder, so array index
 * is unusable. Unpaired nodes fall through to `flushUnmatchedRefIdsFromTree`.
 */
export const repopulateLoadedCollectionTree = (
  loaded: HoppCollection,
  originalsByRefId: Map<string, HoppCollection>
) => {
  if (loaded._ref_id) {
    const original = originalsByRefId.get(loaded._ref_id)
    if (original) {
      populateLocalStoresFromVariables(
        loaded._ref_id,
        promoteInitialValueForImport(original.variables ?? [])
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
 * Flush store entries for `_ref_id`s in `tree` that aren't in `keptRefIds`.
 * Cleans up orphans after `repopulateLoadedCollectionTree` on old SH backends
 * that drop the `data._ref_id` round-trip (entries were seeded under refIds
 * the loaded tree, now on fresh UUIDs, can't reach).
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
 * Flush a team-collection subtree by backend `id`, walking `children`
 * (team shape — not `HoppCollection.folders`) so nested folders' entries
 * aren't left orphaned on delete.
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
