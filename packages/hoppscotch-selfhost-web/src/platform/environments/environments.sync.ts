import { environmentsStore } from "@hoppscotch/common/newstore/environments"
import {
  getSettingSubject,
  settingsStore,
} from "@hoppscotch/common/newstore/settings"

import { getSyncInitFunction } from "../../lib/sync"

import * as E from "fp-ts/Either"

import { StoreSyncDefinitionOf } from "../../lib/sync"
import { createMapper } from "../../lib/sync/mapper"
import {
  clearGlobalEnvironmentVariables,
  createUserEnvironment,
  deleteUserEnvironment,
  updateUserEnvironment,
} from "./environments.api"

export const environmentsMapper = createMapper<number, string>()
export const globalEnvironmentMapper = createMapper<number, string>()

export const storeSyncDefinition: StoreSyncDefinitionOf<
  typeof environmentsStore
> = {
  async createEnvironment({ name, variables }) {
    const lastCreatedEnvIndex = environmentsStore.value.environments.length - 1
    const res = await createUserEnvironment(name, JSON.stringify(variables))

    if (E.isRight(res)) {
      const id = res.right.createUserEnvironment.id
      environmentsMapper.addEntry(lastCreatedEnvIndex, id)
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
          JSON.stringify(env.variables)
        )

        if (E.isRight(res)) {
          const id = res.right.createUserEnvironment.id
          environmentsMapper.addEntry(envId, id)
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
        environmentToDuplicate?.name,
        JSON.stringify(environmentToDuplicate?.variables)
      )

      if (E.isRight(res)) {
        const id = res.right.createUserEnvironment.id
        environmentsMapper.addEntry(lastCreatedEnvIndex, id)
      }
    }
  },
  updateEnvironment({ envIndex, updatedEnv }) {
    const backendId = environmentsMapper.getBackendIDByLocalID(envIndex)
    console.log(environmentsMapper)

    if (backendId) {
      updateUserEnvironment(backendId, updatedEnv)()
    }
  },
  async deleteEnvironment({ envIndex }) {
    const backendId = environmentsMapper.getBackendIDByLocalID(envIndex)

    if (backendId) {
      await deleteUserEnvironment(backendId)()
      environmentsMapper.removeEntry(backendId)
    }
  },
  setGlobalVariables({ entries }) {
    const backendId = globalEnvironmentMapper.getBackendIDByLocalID(0)

    if (backendId) {
      updateUserEnvironment(backendId, { name: "", variables: entries })()
    }
  },
  clearGlobalVariables() {
    const backendId = globalEnvironmentMapper.getBackendIDByLocalID(0)

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
