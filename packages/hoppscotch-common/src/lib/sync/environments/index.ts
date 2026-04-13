import {
  environmentsStore,
  getGlobalVariableID,
  removeDuplicateEntry,
} from "~/newstore/environments"
import { getSyncInitFunction, StoreSyncDefinitionOf } from "../index"
import { createMapper } from "../mapper"

import * as E from "fp-ts/Either"
import { getSettingSubject, settingsStore } from "~/newstore/settings"

// Environments Sync Types
export interface EnvironmentsAPI {
  createUserEnvironment: (name: string, variables: string) => Promise<any>
  deleteUserEnvironment: (envID: string) => () => Promise<any>
  updateUserEnvironment: (envID: string, updatedEnv: any) => () => Promise<any>
  clearGlobalEnvironmentVariables: (envID: string) => void
}

export interface EnvironmentsSyncOptions {
  getSyncInitFunction: typeof getSyncInitFunction
  removeDuplicateEntry: typeof removeDuplicateEntry
  secretEnvironmentService: {
    updateSecretEnvironmentID: (oldID: string, newID: string) => void
  }
  currentEnvironmentValueService: {
    updateEnvironmentID: (oldID: string, newID: string) => void
  }
}

export function createEnvironmentsSync(
  api: EnvironmentsAPI,
  options: EnvironmentsSyncOptions
) {
  const environmentsMapper = createMapper<number, string>()
  const globalEnvironmentMapper = createMapper<number, string>()

  const storeSyncDefinition: StoreSyncDefinitionOf<typeof environmentsStore> = {
    async createEnvironment({ name, variables }) {
      const lastCreatedEnvIndex =
        environmentsStore.value.environments.length - 1

      const res = await api.createUserEnvironment(
        name,
        JSON.stringify(variables)
      )

      if (E.isRight(res)) {
        const id = res.right.createUserEnvironment.id

        options.secretEnvironmentService.updateSecretEnvironmentID(
          environmentsStore.value.environments[lastCreatedEnvIndex].id,
          id
        )

        options.currentEnvironmentValueService.updateEnvironmentID(
          environmentsStore.value.environments[lastCreatedEnvIndex].id,
          id
        )

        environmentsStore.value.environments[lastCreatedEnvIndex].id = id
        options.removeDuplicateEntry(id)
      }
    },
    async appendEnvironments({ envs }) {
      const appendListLength = envs.length
      let appendStart =
        environmentsStore.value.environments.length - appendListLength - 1

      envs.forEach((env) => {
        const envId = ++appendStart

        ;(async function () {
          const res = await api.createUserEnvironment(
            env.name,
            JSON.stringify(env.variables)
          )

          if (E.isRight(res)) {
            const id = res.right.createUserEnvironment.id
            environmentsStore.value.environments[envId].id = id

            options.removeDuplicateEntry(id)
          }
        })()
      })
    },
    async duplicateEnvironment({ envIndex }) {
      const environmentToDuplicate = environmentsStore.value.environments.find(
        (_, index) => index === envIndex
      )

      const lastCreatedEnvIndex =
        environmentsStore.value.environments.length - 1

      if (environmentToDuplicate) {
        const res = await api.createUserEnvironment(
          `${environmentToDuplicate?.name} - Duplicate`,
          JSON.stringify(environmentToDuplicate?.variables)
        )

        if (E.isRight(res)) {
          const id = res.right.createUserEnvironment.id
          environmentsStore.value.environments[lastCreatedEnvIndex].id = id

          options.removeDuplicateEntry(id)
        }
      }
    },
    updateEnvironment({ envIndex, updatedEnv }) {
      const backendId = environmentsStore.value.environments[envIndex].id
      if (backendId) {
        api.updateUserEnvironment(backendId, updatedEnv)()
      }
    },
    async deleteEnvironment({ envID }) {
      if (envID) {
        await api.deleteUserEnvironment(envID)()
      }
    },
    setGlobalVariables({ entries }) {
      const backendId = getGlobalVariableID()
      if (backendId) {
        api.updateUserEnvironment(backendId, {
          name: "",
          variables: entries,
          id: "",
          v: 2,
        })()
      }
    },
    clearGlobalVariables() {
      const backendId = getGlobalVariableID()

      if (backendId) {
        api.clearGlobalEnvironmentVariables(backendId)
      }
    },
  }

  const environnmentsSyncer = options.getSyncInitFunction(
    environmentsStore,
    storeSyncDefinition,
    () => settingsStore.value.syncEnvironments,
    getSettingSubject("syncEnvironments")
  )

  return {
    environnmentsSyncer,
    environmentsMapper,
    globalEnvironmentMapper,
  }
}
