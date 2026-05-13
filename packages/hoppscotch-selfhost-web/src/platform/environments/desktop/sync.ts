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
        // Capture temp id before backend overwrites it — local stores were
        // populated under this id at import time; we remap, not re-populate.
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

        // Duplicates start fresh on secrets per the per-entity model.

        removeDuplicateEntry(id)
      }
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
    if (envID) {
      await deleteUserEnvironment(envID)()
    }
  },
  setGlobalVariables({ entries }) {
    const backendId = getGlobalVariableID()
    if (backendId) {
      // Send the `{ v, variables }` wrapper, not a bare array — older
      // clients expect the wrapper and crash on `globalEnv.variables.map`
      // otherwise. SH deployments can't be guaranteed in-sync, so the
      // wire shape stays compatible with both.
      const variables = entries?.variables
      if (!Array.isArray(variables)) {
        // Bail on malformed input — an empty wrapper would clear globals
        // on the backend irreversibly.
        console.error(
          "[setGlobalVariables] unexpected variables shape, skipping sync",
          entries
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
