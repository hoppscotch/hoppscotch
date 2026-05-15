import {
  environmentsStore,
  getGlobalVariableID,
  removeDuplicateEntry,
} from "@hoppscotch/common/newstore/environments"
import {
  getSettingSubject,
  settingsStore,
} from "@hoppscotch/common/newstore/settings"

import { getSyncInitFunction, type StoreSyncDefinitionOf } from "@app/lib/sync"

import * as E from "fp-ts/Either"

import { createMapper } from "@app/lib/sync/mapper"

import {
  clearGlobalEnvironmentVariables,
  createUserEnvironment,
  deleteUserEnvironment,
  updateUserEnvironment,
} from "./api"
import { stripSecretVariableValuesForWire } from "@hoppscotch/common/helpers/secretVariables"
import { SecretEnvironmentService } from "@hoppscotch/common/services/secret-environment.service"
import { getService } from "@hoppscotch/common/modules/dioc"
import { CurrentValueService } from "@hoppscotch/common/services/current-environment-value.service"

export const environmentsMapper = createMapper<number, string>()
export const globalEnvironmentMapper = createMapper<number, string>()

const secretEnvironmentService = getService(SecretEnvironmentService)
const currentEnvironmentValueService = getService(CurrentValueService)

// Tracks env ids that are still client-side temporary (`uniqueID()`) while
// the backend create is in flight. `deleteEnvironment` skips the backend
// call when the id is in this set — preventing a spurious 404 during the
// create-then-delete race window. Real backend ids are never added here,
// so deleting an already-synced env always fires the backend mutation.
const pendingTempEnvIds = new Set<string>()

export const storeSyncDefinition: StoreSyncDefinitionOf<
  typeof environmentsStore
> = {
  async createEnvironment({ name, variables }) {
    const lastCreatedEnvIndex = environmentsStore.value.environments.length - 1
    const tempId = environmentsStore.value.environments[lastCreatedEnvIndex]?.id
    if (!tempId) return
    pendingTempEnvIds.add(tempId)

    try {
      const res = await createUserEnvironment(
        name,
        JSON.stringify(stripSecretVariableValuesForWire(variables))
      )

      if (E.isRight(res)) {
        const id = res.right.createUserEnvironment.id

        // Use the captured `tempId` (not a re-read of the array) so the
        // migration still works if the env list shifted during the await.
        // Matches the pattern in `appendEnvironments` below.
        secretEnvironmentService.updateSecretEnvironmentID(tempId, id)
        currentEnvironmentValueService.updateEnvironmentID(tempId, id)

        environmentsStore.value.environments[lastCreatedEnvIndex].id = id
        removeDuplicateEntry(id)
      }
    } finally {
      pendingTempEnvIds.delete(tempId)
    }
  },
  async appendEnvironments({ envs }) {
    const appendListLength = envs.length
    let appendStart =
      environmentsStore.value.environments.length - appendListLength - 1

    envs.forEach((env) => {
      const envId = ++appendStart

      ;(async function () {
        // Capture temp id before backend overwrites it — local stores were
        // populated under this id at import time; we remap, not re-populate.
        const tempId = environmentsStore.value.environments[envId]?.id
        if (!tempId) return
        pendingTempEnvIds.add(tempId)

        try {
          // Strip at the wire-write boundary even though the import caller
          // pre-strips — `appendEnvironments` is a public store API; the
          // invariant can't rely on callers.
          const res = await createUserEnvironment(
            env.name,
            JSON.stringify(
              stripSecretVariableValuesForWire(env.variables ?? [])
            )
          )

          if (E.isRight(res)) {
            const id = res.right.createUserEnvironment.id

            secretEnvironmentService.updateSecretEnvironmentID(tempId, id)
            currentEnvironmentValueService.updateEnvironmentID(tempId, id)

            environmentsStore.value.environments[envId].id = id
            removeDuplicateEntry(id)
          } else {
            // Backend rejected — leave local-store entries intact under
            // `tempId` so the env in newstore (which still references
            // `tempId`) continues to render secrets for this session.
            // Reload will drop the env from newstore; the orphaned
            // entries persist but are bounded (one per failed import).
            console.error("[appendEnvironments] backend rejected create")
          }
        } catch (e) {
          // Caught here so the fire-and-forget IIFE doesn't surface an
          // "unhandled promise rejection." Same in-session preservation
          // as the `E.isLeft` branch.
          console.error("[appendEnvironments] backend create threw", e)
        } finally {
          pendingTempEnvIds.delete(tempId)
        }
      })()
    })
  },
  async duplicateEnvironment({ envIndex }) {
    const environmentToDuplicate = environmentsStore.value.environments.find(
      (_, index) => index === envIndex
    )
    if (!environmentToDuplicate) return

    const lastCreatedEnvIndex = environmentsStore.value.environments.length - 1
    const tempId = environmentsStore.value.environments[lastCreatedEnvIndex]?.id
    if (!tempId) return
    pendingTempEnvIds.add(tempId)

    try {
      const res = await createUserEnvironment(
        `${environmentToDuplicate.name} - Duplicate`,
        JSON.stringify(
          stripSecretVariableValuesForWire(
            environmentToDuplicate.variables ?? []
          )
        )
      )

      if (E.isRight(res)) {
        const id = res.right.createUserEnvironment.id
        environmentsStore.value.environments[lastCreatedEnvIndex].id = id

        // Duplicates start fresh on secrets per the per-entity model.
        removeDuplicateEntry(id)
      }
    } finally {
      pendingTempEnvIds.delete(tempId)
    }
  },
  updateEnvironment({ envIndex, updatedEnv }) {
    const backendId = environmentsStore.value.environments[envIndex].id
    if (backendId) {
      updateUserEnvironment(
        backendId,
        updatedEnv.name,
        JSON.stringify(
          stripSecretVariableValuesForWire(updatedEnv.variables ?? [])
        )
      )()
    }
  },
  async deleteEnvironment({ envID }) {
    // Skip when the id belongs to an env whose backend create is still in
    // flight — sending the temp `uniqueID()` would 404 and the backend
    // create would still complete, orphaning a row. Already-synced envs
    // are never in `pendingTempEnvIds`, so this only filters the race
    // window; normal deletes fire the backend mutation.
    if (envID && !pendingTempEnvIds.has(envID)) {
      await deleteUserEnvironment(envID)()
    }
  },
  setGlobalVariables({ entries }) {
    const backendId = getGlobalVariableID()
    if (backendId) {
      // Bail on malformed input — syncing the dispatcher-coerced `[]`
      // would clear backend globals irreversibly. Leaving FE/BE desynced
      // is recoverable (reload re-hydrates from backend), data loss is
      // not. The dispatcher's coerce only protects FE state.
      const variables = entries?.variables
      if (!Array.isArray(variables)) {
        console.error(
          "[setGlobalVariables] unexpected variables shape, skipping sync"
        )
        return
      }
      updateUserEnvironment(
        backendId,
        "",
        JSON.stringify({
          v: 2,
          variables: stripSecretVariableValuesForWire(variables),
        })
      )()
    }
  },
  clearGlobalVariables() {
    const backendId = getGlobalVariableID()

    if (backendId) {
      clearGlobalEnvironmentVariables(backendId)
    }

    // Flush "Global" entries so a later add doesn't alias stale `varIndex`.
    secretEnvironmentService.addSecretEnvironment("Global", [])
    currentEnvironmentValueService.addEnvironment("Global", [])
  },
}

export const environnmentsSyncer = getSyncInitFunction(
  environmentsStore,
  storeSyncDefinition,
  () => settingsStore.value.syncEnvironments,
  getSettingSubject("syncEnvironments")
)
