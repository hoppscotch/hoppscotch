import * as O from "fp-ts/Option"
import cloneDeep from "lodash/cloneDeep"
import { TestScriptReport } from "../../test-runner"

export function deleteEnv(envName: string, envs: TestScriptReport["envs"]) {
  const updatedEnvs = cloneDeep(envs)
  const indexInGlobal = envs.global.findIndex((x) => x.key === envName)
  const indexInSelected = envs.selected.findIndex((x) => x.key === envName)

  updatedEnvs.global.splice(indexInGlobal, 1)
  updatedEnvs.selected.splice(indexInSelected, 1)

  return updatedEnvs
}

export function getActiveEnv(envName: string, envs: TestScriptReport["envs"]) {
  return O.fromNullable(envs.selected.find((x) => x.key === envName))
}

export function getGlobalEnv(envName: string, envs: TestScriptReport["envs"]) {
  return O.fromNullable(envs.global.find((x) => x.key === envName))
}

export function getEnv(envName: string, envs: TestScriptReport["envs"]) {
  return O.fromNullable(
    envs.selected.find((x) => x.key === envName) ??
      envs.global.find((x) => x.key === envName)
  )
}

export function setEnv(
  envName: string,
  envValue: string,
  envs: TestScriptReport["envs"]
): TestScriptReport["envs"] {
  const indexInSelected = envs.selected.findIndex((x) => x.key === envName)

  // Found the match in selected
  if (indexInSelected >= 0) {
    envs.selected[indexInSelected].value = envValue

    return {
      global: envs.global,
      selected: envs.selected,
    }
  }

  const indexInGlobal = envs.global.findIndex((x) => x.key == envName)

  // Found a match in globals
  if (indexInGlobal >= 0) {
    envs.global[indexInGlobal].value = envValue

    return {
      global: envs.global,
      selected: envs.selected,
    }
  }

  // Didn't find in both places, create a new variable in selected
  envs.selected.push({
    key: envName,
    value: envValue,
  })

  return {
    global: envs.global,
    selected: envs.selected,
  }
}
