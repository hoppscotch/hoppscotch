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
 * No-ops for empty inputs so callers can apply it unconditionally.
 */
export const populateLocalStoresFromVariables = (
  entityId: string,
  variables: readonly SecretCapableVariable[]
) => {
  if (!entityId || variables.length === 0) return

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

  if (secrets.length > 0) {
    secretEnvironmentService.addSecretEnvironment(entityId, secrets)
  }
  if (nonSecrets.length > 0) {
    currentEnvironmentValueService.addEnvironment(entityId, nonSecrets)
  }
}
