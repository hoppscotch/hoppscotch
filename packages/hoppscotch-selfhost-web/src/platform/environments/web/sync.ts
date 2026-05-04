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
import type { Environment, GlobalEnvironment } from "@hoppscotch/data"

export const environmentsMapper = createMapper<number, string>()
export const globalEnvironmentMapper = createMapper<number, string>()

const secretEnvironmentService = getService(SecretEnvironmentService)
const currentEnvironmentValueService = getService(CurrentValueService)

export const storeSyncDefinition: StoreSyncDefinitionOf<
  typeof environmentsStore
> = {
  async createEnvironment({ name, variables }) {
    const lastCreatedEnvIndex = environmentsStore.value.environments.length - 1

    const res = await createUserEnvironment(
      name,
      JSON.stringify(stripSecretVariableValuesForWire(variables))
    )

    if (E.isRight(res)) {
      const id = res.right.createUserEnvironment.id

      secretEnvironmentService.updateSecretEnvironmentID(
        environmentsStore.value.environments[lastCreatedEnvIndex].id,
        id
      )
      currentEnvironmentValueService.updateEnvironmentID(
        environmentsStore.value.environments[lastCreatedEnvIndex].id,
        id
      )

      environmentsStore.value.environments[lastCreatedEnvIndex].id = id
      removeDuplicateEntry(id)
    }
  },
  async appendEnvironments({ envs }) {
    const appendListLength = envs.length
    let appendStart =
      environmentsStore.value.environments.length - appendListLength - 1

    envs.forEach((env) => {
      const envId = ++appendStart

      ;(async function () {
        // Snapshot the temp local id BEFORE the backend create overwrites
        // it. The local secret + currentValue stores were already populated
        // under this temp id at import time (`handleImportToStore`), so we
        // remap rather than re-populate — the sync handler's `env.variables`
        // is already stripped (newstore was pre-stripped at import time)
        // and would otherwise overwrite the raw values with empty ones.
        const tempId = environmentsStore.value.environments[envId].id

        const res = await createUserEnvironment(
          env.name,
          JSON.stringify(stripSecretVariableValuesForWire(env.variables))
        )

        if (E.isRight(res)) {
          const id = res.right.createUserEnvironment.id

          secretEnvironmentService.updateSecretEnvironmentID(tempId, id)
          currentEnvironmentValueService.updateEnvironmentID(tempId, id)

          environmentsStore.value.environments[envId].id = id
          removeDuplicateEntry(id)
        }
      })()
    })
  },
  async duplicateEnvironment({ envIndex }) {
    const environmentToDuplicate = environmentsStore.value.environments.find(
      (_, index) => index === envIndex
    )

    const lastCreatedEnvIndex = environmentsStore.value.environments.length - 1

    if (environmentToDuplicate) {
      const res = await createUserEnvironment(
        `${environmentToDuplicate?.name} - Duplicate`,
        JSON.stringify(
          stripSecretVariableValuesForWire(
            environmentToDuplicate?.variables ?? []
          )
        )
      )

      if (E.isRight(res)) {
        const id = res.right.createUserEnvironment.id
        environmentsStore.value.environments[lastCreatedEnvIndex].id = id

        // Secret variable values are intentionally NOT copied to the
        // duplicated environment — duplicates start fresh on secrets per the
        // per-entity secret model. The user must re-enter them on this device.

        removeDuplicateEntry(id)
      }
    }
  },
  updateEnvironment({ envIndex, updatedEnv }) {
    const backendId = environmentsStore.value.environments[envIndex].id
    if (backendId) {
      updateUserEnvironment(backendId, updatedEnv)()
    }
  },
  async deleteEnvironment({ envID }) {
    if (envID) {
      await deleteUserEnvironment(envID)()
    }
  },
  setGlobalVariables({ entries }) {
    const backendId = getGlobalVariableID()
    if (backendId) {
      // The backend stores `Environment.variables` JSON-stringified, and
      // `loadGlobalEnvironments` parses that string via verzod's
      // `GlobalEnvironment` entity reference — which expects the wrapped
      // `{ v, variables }` shape, not a bare array. Send the wrapper (with
      // secrets stripped from its variables) so the round-trip stays
      // compatible with existing rows.
      const stripped: GlobalEnvironment = {
        ...entries,
        variables: stripSecretVariableValuesForWire(entries.variables ?? []),
      }
      updateUserEnvironment(backendId, {
        name: "",
        variables: stripped as unknown as Environment["variables"],
        id: "",
        v: 2,
      })()
    }
  },
  clearGlobalVariables() {
    const backendId = getGlobalVariableID()

    if (backendId) {
      clearGlobalEnvironmentVariables(backendId)
    }
  },
}

export const environnmentsSyncer = getSyncInitFunction(
  environmentsStore,
  storeSyncDefinition,
  () => settingsStore.value.syncEnvironments,
  getSettingSubject("syncEnvironments")
)
