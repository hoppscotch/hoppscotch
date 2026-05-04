import { generateUniqueRefId, type HoppCollection } from "@hoppscotch/data"

import { getService } from "../modules/dioc"
import { CurrentValueService } from "../services/current-environment-value.service"
import { SecretEnvironmentService } from "../services/secret-environment.service"

/**
 * Structural shape shared by Hoppscotch's collection variables and
 * environment variables. Both carry a `secret` flag; both are persisted
 * server-side via JSON blobs.
 */
type SecretCapableVariable = {
  key: string
  initialValue: string
  currentValue: string
  secret: boolean
}

/**
 * Strip the values of secret variables before sending them to the backend.
 * Used at the wire boundary for both collection variables and environment
 * variables. The user's actual secret values stay in the local secret store
 * (see `secretEnvironmentService`); only the slot — `key` and `secret: true`
 * — survives onto the wire so the UI can still render it.
 *
 * `currentValue` is also cleared on all (non-secret) variables to match the
 * existing Hoppscotch convention that `currentValue` is per-user/per-session
 * state and never persisted server-side.
 *
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
 * Populate the local secret store and current-value store from a variables
 * array, keyed by the entity's local ID. Mirrors what `setCollectionProperties`
 * and `saveEnvironment` do on UI-edit save: extract `secret: true` entries to
 * `secretEnvironmentService`, extract `currentValue` for non-secret entries to
 * `currentEnvironmentValueService`.
 *
 * Required for any code path that ingests user-authored variables WITHOUT
 * going through the UI save flow — imports, duplicates, restore-from-file —
 * because the wire-strip removes the values from the payload that round-trips
 * through the backend, so without this hook the user loses them on next
 * `setRESTCollections` / `replaceEnvironments` from a backend fetch.
 *
 * Always writes to both stores when the entityId is non-empty (even when one
 * side has zero entries) so a re-import or re-save with fewer/no secrets
 * clears any stale entries from a previous version of the same entity.
 *
 * IMPORTANT — pre-stripped inputs: if `variables` already comes from a
 * stripped source (a Hoppscotch JSON export, or a backend row reload), each
 * `secret: true` entry will have `currentValue: ""` and `initialValue: ""`.
 * Calling this with such inputs persists `""` as the secret value, and the
 * UI shows blank fields after re-import. That matches the security posture
 * (secrets never leave the source device, so reimporting can't recover
 * them — users must re-enter them on each new device), but callers that
 * expect values to survive re-import are misusing this helper. Pass the
 * RAW user-authored variables here, before any wire-strip runs.
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
            value: v.currentValue ?? "",
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
            currentValue: v.currentValue ?? "",
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
 * Recursive variant of `populateLocalStoresFromVariables` for a HoppCollection
 * tree (collection + nested folders). Walks the tree and populates the local
 * stores for every node that has a `_ref_id`.
 *
 * Used at import-time entry points BEFORE the wire strip runs, so that even
 * the logged-out / no-platform-sync branch (which skips
 * `translateToPersonalCollectionFormat`) preserves user-supplied secret +
 * currentValue inputs in the local stores. On subsequent login + sync, the
 * wire payload is stripped but the secret store still has the values keyed
 * by the same `_ref_id` that round-trips through the backend `data` blob.
 */
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

/**
 * Walk a collection tree assigning a fresh `_ref_id` to any node that lacks
 * one. Returns a deep-cloned tree (input is not mutated). Used at every
 * import entry point before the wire strip / local-store populate runs, so
 * the secret values are addressable by ref-id no matter which downstream
 * branch (backend success, backend failure, logged-out append) executes.
 */
export const ensureRefIds = (collection: HoppCollection): HoppCollection => ({
  ...collection,
  _ref_id: collection._ref_id ?? generateUniqueRefId("coll"),
  folders: (collection.folders ?? []).map(ensureRefIds),
})

/**
 * Recursive variant of `stripSecretVariableValuesForWire` for a collection
 * tree. Returns a deep-cloned tree with every node's `variables` array
 * stripped (secret values blanked, non-secret `currentValue` cleared).
 *
 * Used wherever an imported tree is appended directly to newstore (the
 * logged-out / no-platform-sync branch and the platform fallback when the
 * backend bulk-import fails) so raw secrets don't sit in newstore /
 * localStorage / future sync payloads. The local secret + currentValue
 * stores must already be populated (via `populateLocalStoresFromCollectionTree`
 * keyed by the same `_ref_id`s) so the UI can rehydrate values on read.
 */
export const stripCollectionTreeForStore = (
  collection: HoppCollection
): HoppCollection => ({
  ...collection,
  variables: stripSecretVariableValuesForWire(collection.variables ?? []),
  folders: (collection.folders ?? []).map(stripCollectionTreeForStore),
})
