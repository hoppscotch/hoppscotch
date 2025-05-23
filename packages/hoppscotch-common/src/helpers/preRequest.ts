import * as E from "fp-ts/Either"
import { runPreRequestScript } from "@hoppscotch/js-sandbox/web"
import { Environment } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"

import {
  getCurrentEnvironment,
  getGlobalVariables,
} from "~/newstore/environments"
import { TestResult } from "@hoppscotch/js-sandbox"
import { getService } from "~/modules/dioc"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { CurrentValueService } from "~/services/current-environment-value.service"

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
      }
    }
    return { ...globalVar, currentValue: currentVar?.currentValue ?? "" }
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
        }
      }
      return { ...selectedVar, currentValue: currentVar?.currentValue ?? "" }
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

export const getFinalEnvsFromPreRequest = (
  script: string,
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
    temp: Environment["variables"]
  }
): Promise<E.Either<string, TestResult["envs"]>> =>
  runPreRequestScript(script, envs)
