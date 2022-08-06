import * as O from "fp-ts/Option"
import cloneDeep from "lodash/cloneDeep"
import { TestScriptReport } from "../../test-runner"

export function deleteEnv(varName: string, envs: TestScriptReport["envs"]) {
  const updatedEnvs = cloneDeep(envs)
  const indexInGlobal = envs.global.findIndex((x) => x.key === varName)
  const indexInSelected = envs.selected.findIndex((x) => x.key === varName)

  updatedEnvs.global.splice(indexInGlobal, 1)
  updatedEnvs.selected.splice(indexInSelected, 1)

  return updatedEnvs
}

export function getActiveEnv(varName: string, envs: TestScriptReport["envs"]) {
  return O.fromNullable(envs.selected.find((x) => x.key === varName))
}

export function getGlobalEnv(varName: string, envs: TestScriptReport["envs"]) {
  return O.fromNullable(envs.global.find((x) => x.key === varName))
}

export function getEnv(varName: string, envs: TestScriptReport["envs"]) {
  return O.fromNullable(
    envs.selected.find((x) => x.key === varName) ??
      envs.global.find((x) => x.key === varName)
  )
}

export function setEnv(
  varName: string,
  varValue: string,
  envs: TestScriptReport["envs"]
): TestScriptReport["envs"] {
  const indexInSelected = envs.selected.findIndex((x) => x.key === varName)

  // Found the match in selected
  if (indexInSelected >= 0) {
    envs.selected[indexInSelected].value = varValue

    return {
      global: envs.global,
      selected: envs.selected,
    }
  }

  const indexInGlobal = envs.global.findIndex((x) => x.key == varName)

  // Found a match in globals
  if (indexInGlobal >= 0) {
    envs.global[indexInGlobal].value = varValue

    return {
      global: envs.global,
      selected: envs.selected,
    }
  }

  // Didn't find in both places, create a new variable in selected
  envs.selected.push({
    key: varName,
    value: varValue,
  })

  return {
    global: envs.global,
    selected: envs.selected,
  }
}
