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
import {
  populateLocalStoresFromVariables,
  stripSecretVariableValuesForWire,
} from "@hoppscotch/common/helpers/secretVariables"
import { SecretEnvironmentService } from "@hoppscotch/common/services/secret-environment.service"
import { getService } from "@hoppscotch/common/modules/dioc"
import { CurrentValueService } from "@hoppscotch/common/services/current-environment-value.service"

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
        const res = await createUserEnvironment(
          env.name,
          JSON.stringify(stripSecretVariableValuesForWire(env.variables))
        )

        if (E.isRight(res)) {
          const id = res.right.createUserEnvironment.id
          environmentsStore.value.environments[envId].id = id

          // Persist the imported secret + currentValue inputs to the local
          // stores keyed by the new backend ID. Without this, the next
          // `replaceEnvironments` (run on app load from the now-stripped
          // backend row) wipes them and the user loses their imported data.
          populateLocalStoresFromVariables(id, env.variables)

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
      updateUserEnvironment(backendId, {
        name: "",
        variables: stripSecretVariableValuesForWire(entries),
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
