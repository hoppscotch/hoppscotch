import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import cloneDeep from "lodash/cloneDeep"
import {
  QuickJSContext,
  QuickJSHandle,
  VmFunctionImplementation,
} from "quickjs-emscripten"
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
  vmFnPairs: VmFnPairs<T>[]
): QuickJSHandle[] => {
  const handlers: QuickJSHandle[] = []

  vmFnPairs.forEach(({ func, key }) => {
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

type VmFnImplementation = VmFunctionImplementation<QuickJSHandle>

export type VmFnPairs<T> = { key: T; func: VmFnImplementation }

/**
 * A wrapper to define function for QuickJS.newFunction(...) supporting type-checks independently.
 * @param func Defined function of type VmFnImplementation.
 * @returns Lazy function for QuickJS.newFunction(...)
 */
export const defineVmFn = (func: VmFnImplementation) => func

/**
 * Get the starting line number of given function in test-script or pre-request-script.
 *
 * For example:- For below script.
 *
 * `
 * pw.env.get("a")
 *
 * pw.console.log("DATA")
 * `
 *
 * Line number for pw.env.get function is 2
 * Line number for pw.console.log function is 4
 *
 * @param target Function name in string format to search within script.
 * @param source Script to where target function needs will be searched.
 * @returns Line number of target within script.
 */
export const getFunctionLineNumber = (target: string, source: string) => {
  const codeBlocks = source.split("\n")
  const codeBlocksCount = codeBlocks.length

  for (let index = 0; index < codeBlocksCount; index++) {
    if (codeBlocks[index].includes(target)) {
      return index + 1
    }
  }

  return -1
}

export const updateScript = (
  lineNumber: number,
  source: string,
  target?: string
) => {
  const codeBlocks = source.split("\n")

  codeBlocks[lineNumber - 1] = target ?? ""

  return codeBlocks.join("\n")
}
