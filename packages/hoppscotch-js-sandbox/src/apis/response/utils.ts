import { QuickJSContext, QuickJSHandle } from "quickjs-emscripten"
import * as E from "fp-ts/Either"

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
