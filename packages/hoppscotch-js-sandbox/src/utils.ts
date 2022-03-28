import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import * as QuickJS from "quickjs-emscripten"
import { TestResult } from "./test-runner"

export function marshalObjectToVM(
  vm: QuickJS.QuickJSVm,
  obj: object
): E.Either<string, QuickJS.QuickJSHandle> {
  let jsonString

  try {
    jsonString = JSON.stringify(obj)
  } catch (e) {
    return E.left("Marshaling stringification failed")
  }

  const vmStringHandle = vm.newString(jsonString)

  const jsonHandle = vm.getProp(vm.global, "JSON")
  const parseFuncHandle = vm.getProp(jsonHandle, "parse")

  const parseResultHandle = vm.callFunction(
    parseFuncHandle,
    vm.undefined,
    vmStringHandle
  )

  if (parseResultHandle.error) {
    parseResultHandle.error.dispose()
    return E.left("Marshaling failed")
  }

  const resultHandle = vm.unwrapResult(parseResultHandle)

  vmStringHandle.dispose()
  parseFuncHandle.dispose()
  jsonHandle.dispose()

  return E.right(resultHandle)
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
