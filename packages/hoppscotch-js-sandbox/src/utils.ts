import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"

import { TestResult } from "./test-runner"

export function preventCyclicObjects(
  obj: Record<string, any>
): E.Left<string> | E.Right<Record<string, any>> {
  let jsonString

  try {
    jsonString = JSON.stringify(obj)
  } catch (e) {
    return E.left("Stringification failed")
  }

  try {
    const parsedJson = JSON.parse(jsonString)
    return E.right(parsedJson)
  } catch (err) {
    return E.left("Parsing failed")
  }
}

export function getEnv(envName: string, envs: TestResult["envs"]) {
  return O.fromNullable(
    envs.selected.find((x) => x.key === envName) ??
      envs.global.find((x) => x.key === envName)
  )
}

export function setEnv(
  envName: string,
  envValue: string,
  envs: TestResult["envs"]
): TestResult["envs"] {
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
