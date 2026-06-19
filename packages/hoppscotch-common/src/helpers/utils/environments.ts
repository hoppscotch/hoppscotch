import { Environment, HoppRESTRequestVariable } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"

import { getService } from "~/modules/dioc"
import {
  getCurrentEnvironment,
  getGlobalVariables,
  AggregateEnvironment,
} from "~/newstore/environments"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { transformInheritedCollectionVariablesToAggregateEnv } from "./inheritedCollectionVarTransformer"

const secretEnvironmentService = getService(SecretEnvironmentService)
const currentEnvironmentValueService = getService(CurrentValueService)

/**
 * Populate the currentValue of the environment variables and set the secret values
 * @param selected
 * @param global
 * @returns
 */
const unWrapEnvironments = (
  selected: Environment,
  global: Environment["variables"]
) => {
  const resolvedGlobalWithSecrets = global.map((globalVar, index) => {
    const secretVar = secretEnvironmentService.getSecretEnvironmentVariable(
      "Global",
      index
    )
    const currentVar = currentEnvironmentValueService.getEnvironmentVariable(
      "Global",
      index
    )

    if (secretVar) {
      return {
        ...globalVar,
        currentValue: secretVar.value,
        initialValue: secretVar.initialValue ?? "",
      }
    }
    return {
      ...globalVar,
      currentValue: currentVar?.currentValue || globalVar.currentValue || "",
    }
  })

  const resolvedSelectedWithSecrets = selected.variables.map(
    (selectedVar, index) => {
      const secretVar = secretEnvironmentService.getSecretEnvironmentVariable(
        selected.id,
        index
      )
      const currentVar = currentEnvironmentValueService.getEnvironmentVariable(
        selected.id,
        index
      )
      if (secretVar) {
        return {
          ...selectedVar,
          currentValue: secretVar.value,
          initialValue: secretVar.initialValue ?? "",
        }
      }
      return {
        ...selectedVar,
        currentValue:
          currentVar?.currentValue || selectedVar.currentValue || "",
      }
    }
  )

  return {
    global: resolvedGlobalWithSecrets,
    selected: resolvedSelectedWithSecrets,
  }
}

export const getCombinedEnvVariables = (temp?: Environment["variables"]) => {
  const reformedVars = unWrapEnvironments(
    getCurrentEnvironment(),
    getGlobalVariables()
  )
  return {
    global: cloneDeep(reformedVars.global),
    selected: cloneDeep(reformedVars.selected),
    temp: temp ? cloneDeep(temp) : [],
  }
}

export const getEffectiveVariablesForRequest = (
  requestVariables: HoppRESTRequestVariable[] | undefined,
  inheritedVariables: HoppInheritedProperty["variables"] | undefined,
  environmentVars: AggregateEnvironment[]
): AggregateEnvironment[] => {
  const requestVars = (requestVariables ?? [])
    .filter((v) => v.active)
    .map((v) => ({
      key: v.key,
      currentValue: v.value,
      initialValue: v.value,
      sourceEnv: "RequestVariable",
      secret: false,
    }))

  const collectionVars = transformInheritedCollectionVariablesToAggregateEnv(
    inheritedVariables ?? []
  )

  return [...requestVars, ...collectionVars, ...environmentVars]
}

