import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import cloneDeep from "lodash/cloneDeep"
import {
  QuickJSContext,
  QuickJSHandle,
  VmFunctionImplementation,
} from "quickjs-emscripten"
import { TestScriptReport } from "./test-runner"
import { Environment } from "@hoppscotch/data"

export function marshalObjectToVM(
  vm: QuickJSContext,
  obj: object
): E.Either<string, QuickJSHandle> {
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

export const throwErr = (err: string) => {
  throw new Error(err)
}

export const unsafeCast = <T>(x: any): T => x

export const getObjectKeysFromHandle =
  (vm: QuickJSContext) => (handle: QuickJSHandle) => {
    // TODO: Check if handle actually belongs to an object and is not null ?
    const funcHandle = vm.unwrapResult(vm.evalCode("(x) => Object.keys(x)"))

    const result = pipe(
      vm.callFunction(funcHandle, vm.undefined, handle),
      vm.unwrapResult,
      vm.dump
    ) as Array<string>

    funcHandle.dispose()

    return result
  }

export const unsafeEffect =
  <T>(func: (input: T) => void): ((input: T) => T) =>
  (input) => {
    func(input)

    return input
  }

export const disposeHandlers = (handlers: QuickJSHandle[]) => {
  handlers.forEach((handler) => {
    handler.dispose()
  })
}

export const setFnHandlers = <T extends string>(
  vm: QuickJSContext,
  handle: QuickJSHandle,
  handlerPairs: HandleFnPairs<T>[]
): QuickJSHandle[] => {
  const handlers: QuickJSHandle[] = []

  handlerPairs.forEach((handlerPair) => {
    const { func, key } = handlerPair
    const funcHandle = vm.newFunction(key, func)
    vm.setProp(handle, key, funcHandle)
    handlers.push(funcHandle)
  })

  return handlers
}

export const mergeEnvs = (
  originalEnvs: Environment["variables"],
  newEnvs: Environment["variables"]
) => {
  const envs: Environment["variables"] = cloneDeep(originalEnvs)
  const keyIndexes: Record<string, number> = {}

  envs.forEach(({ key }, index) => {
    keyIndexes[key] = index
  })

  newEnvs.forEach(({ key, value }) => {
    const keyIndex = keyIndexes[key]

    if (typeof keyIndex === "number") {
      envs[keyIndex].value = value
    } else {
      envs.push({ key, value })
    }
  })

  return envs
}

export type HandleFnImplementation = VmFunctionImplementation<QuickJSHandle>

export type HandleFnPairs<T> = { key: T; func: HandleFnImplementation }

export const defineHandleFn = (func: HandleFnImplementation) => func
