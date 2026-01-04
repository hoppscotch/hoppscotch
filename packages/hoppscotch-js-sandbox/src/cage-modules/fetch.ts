import {
  defineCageModule,
  defineSandboxFunctionRaw,
} from "faraday-cage/modules"
import type { HoppFetchHook } from "~/types"

/**
 * Type augmentation for Headers to include iterator methods
 * These methods exist in modern Headers implementations but may not be in all type definitions
 */
interface HeadersWithIterators extends Headers {
  entries(): IterableIterator<[string, string]>
  keys(): IterableIterator<string>
  values(): IterableIterator<string>
}

/**
 * Extended Response type with internal properties for serialization
 * These properties are added by HoppFetchHook implementations
 */
type SerializableResponse = Response & {
  /**
   * Raw body bytes for efficient transfer across VM boundary
   */
  _bodyBytes: number[]
  /**
   * Plain object containing header key-value pairs (no methods)
   * Used for efficient iteration in the VM without native Headers methods
   */
  _headersData?: Record<string, string>
}

/**
 * Type for async script execution hooks
 * Although typed as (() => void) in faraday-cage, the runtime supports async functions
 */
type AsyncScriptExecutionHook = () => Promise<void>

/**
 * Interface for configuring the custom fetch module
 */
export type CustomFetchModuleConfig = {
  /**
   * Custom fetch implementation to use (HoppFetchHook)
   */
  fetchImpl?: HoppFetchHook
}

/**
 * Creates a custom fetch module that uses HoppFetchHook
 * This module wraps the HoppFetchHook and provides proper async handling
 */
export const customFetchModule = (config: CustomFetchModuleConfig = {}) =>
  defineCageModule((ctx) => {
    const fetchImpl = config.fetchImpl || globalThis.fetch

    // Track pending async operations
    const pendingOperations: Promise<unknown>[] = []
    let resolveKeepAlive: (() => void) | null = null

    // Create keepAlive promise BEFORE registering hook
    const keepAlivePromise = new Promise<void>((resolve) => {
      resolveKeepAlive = resolve
    })

    ctx.keepAlivePromises.push(keepAlivePromise)

    // Register async hook to wait for all fetch operations
    // NOTE: faraday-cage's afterScriptExecutionHooks types are (() => void) but runtime supports async
    const asyncHook: AsyncScriptExecutionHook = async () => {
      // Poll until all operations are complete with grace period
      let emptyRounds = 0
      const maxEmptyRounds = 5

      while (emptyRounds < maxEmptyRounds) {
        if (pendingOperations.length > 0) {
          emptyRounds = 0
          await Promise.allSettled(pendingOperations)
          await new Promise((r) => setTimeout(r, 10))
        } else {
          emptyRounds++
          // Grace period: wait for VM to process jobs
          await new Promise((r) => setTimeout(r, 10))
        }
      }
      resolveKeepAlive?.()
    }
    ctx.afterScriptExecutionHooks.push(asyncHook as () => void)

    // Track async operations
    const trackAsyncOperation = <T>(promise: Promise<T>): Promise<T> => {
      pendingOperations.push(promise)
      return promise.finally(() => {
        const index = pendingOperations.indexOf(promise)
        if (index > -1) {
          pendingOperations.splice(index, 1)
        }
      })
    }

    // Helper to marshal values to VM
    const marshalValue = (value: any): any => {
      if (value === null) return ctx.vm.null
      if (value === undefined) return ctx.vm.undefined
      if (value === true) return ctx.vm.true
      if (value === false) return ctx.vm.false
      if (typeof value === "string")
        return ctx.scope.manage(ctx.vm.newString(value))
      if (typeof value === "number")
        return ctx.scope.manage(ctx.vm.newNumber(value))
      if (typeof value === "object") {
        if (Array.isArray(value)) {
          const arr = ctx.scope.manage(ctx.vm.newArray())
          value.forEach((item, i) => {
            ctx.vm.setProp(arr, i, marshalValue(item))
          })
          return arr
        } else {
          const obj = ctx.scope.manage(ctx.vm.newObject())
          for (const [k, v] of Object.entries(value)) {
            ctx.vm.setProp(obj, k, marshalValue(v))
          }
          return obj
        }
      }
      return ctx.vm.undefined
    }

    // Define fetch function in the sandbox
    const fetchFn = defineSandboxFunctionRaw(ctx, "fetch", (...args) => {
      // Check if input is a Request object with native Request data
      let input: RequestInfo | URL
      const firstArg = args[0]
      if ((firstArg as any).__nativeRequestData) {
        // Use the native Request object that was created in the Request constructor
        // This preserves method, body, and headers that would otherwise be lost
        input = (firstArg as any).__nativeRequestData
      } else {
        input = ctx.vm.dump(firstArg)
      }
      const init = args.length > 1 ? args[1] : undefined

      // Check if init has headers that need conversion
      if (init) {
        const headersHandle = ctx.vm.getProp(init, "headers")
        if (headersHandle) {
          // Check if it's a Headers instance
          const isHoppHeaders = ctx.vm.getProp(headersHandle, "__isHoppHeaders")
          if (isHoppHeaders && ctx.vm.typeof(isHoppHeaders) === "boolean") {
            const isHoppHeadersValue = ctx.vm.dump(isHoppHeaders)
            if (isHoppHeadersValue === true) {
              // Call toObject() to get plain object
              const toObjectFn = ctx.vm.getProp(headersHandle, "toObject")
              if (toObjectFn && ctx.vm.typeof(toObjectFn) === "function") {
                const result = ctx.vm.callFunction(toObjectFn, headersHandle)
                if (!result.error) {
                  // Replace headers with the plain object
                  ctx.vm.setProp(init, "headers", result.value)
                  result.value.dispose()
                } else {
                  result.error.dispose()
                }
              }
              toObjectFn?.dispose()
            }
            isHoppHeaders.dispose()
          }
          headersHandle.dispose()
        }
      }

      // Now dump init after conversion
      const dumpedInit = init ? ctx.vm.dump(init) : undefined

      const promiseHandle = ctx.scope.manage(
        ctx.vm.newPromise((resolve, reject) => {
          const fetchPromise = trackAsyncOperation(fetchImpl(input, dumpedInit))

          fetchPromise
            .then(async (response) => {
              // If response doesn't have _bodyBytes, read the body and add it
              // This handles cases where fetchImpl returns a native Response
              let serializableResponse = response as SerializableResponse
              if (!serializableResponse._bodyBytes) {
                const arrayBuffer = await response.arrayBuffer()
                const bodyBytes = Array.from(new Uint8Array(arrayBuffer))
                serializableResponse = Object.assign(response, {
                  _bodyBytes: bodyBytes,
                }) as SerializableResponse
              }

              // Create a serializable response object
              const responseObj = ctx.scope.manage(ctx.vm.newObject())

              // Set basic properties
              ctx.vm.setProp(
                responseObj,
                "status",
                ctx.scope.manage(ctx.vm.newNumber(serializableResponse.status))
              )
              ctx.vm.setProp(
                responseObj,
                "statusText",
                ctx.scope.manage(
                  ctx.vm.newString(serializableResponse.statusText)
                )
              )
              ctx.vm.setProp(
                responseObj,
                "ok",
                serializableResponse.ok ? ctx.vm.true : ctx.vm.false
              )

              // Create headers object with Headers-like interface
              const headersObj = ctx.scope.manage(ctx.vm.newObject())
              // Prefer _headersData for fast-path; otherwise, build from native Headers
              const headersMap: Record<string, string> =
                serializableResponse._headersData ||
                (() => {
                  const map: Record<string, string> = {}
                  try {
                    const nativeHeaders = (serializableResponse as Response)
                      .headers as any
                    if (
                      nativeHeaders &&
                      typeof nativeHeaders.forEach === "function"
                    ) {
                      ;(nativeHeaders as Headers).forEach((value, key) => {
                        map[String(key).toLowerCase()] = String(value)
                      })
                    } else if (
                      nativeHeaders &&
                      typeof nativeHeaders.entries === "function"
                    ) {
                      for (const [key, value] of nativeHeaders.entries()) {
                        map[String(key).toLowerCase()] = String(value)
                      }
                    }
                  } catch (_) {
                    // ignore fallback errors; leave map empty
                  }
                  return map
                })()

              // Set individual header properties
              for (const [key, value] of Object.entries(headersMap)) {
                ctx.vm.setProp(
                  headersObj,
                  key,
                  ctx.scope.manage(ctx.vm.newString(String(value)))
                )
              }

              // Add entries() method for Headers compatibility
              // Returns an array of [key, value] pairs
              // QuickJS arrays are iterable by default, so for...of will work
              const entriesFn = defineSandboxFunctionRaw(ctx, "entries", () => {
                const entriesArray = ctx.scope.manage(ctx.vm.newArray())
                let index = 0
                for (const [key, value] of Object.entries(headersMap)) {
                  const entry = ctx.scope.manage(ctx.vm.newArray())
                  ctx.vm.setProp(
                    entry,
                    0,
                    ctx.scope.manage(ctx.vm.newString(key))
                  )
                  ctx.vm.setProp(
                    entry,
                    1,
                    ctx.scope.manage(ctx.vm.newString(String(value)))
                  )
                  ctx.vm.setProp(entriesArray, index++, entry)
                }
                return entriesArray
              })
              ctx.vm.setProp(headersObj, "entries", entriesFn)

              // Add get() method for Headers compatibility
              const getFn = defineSandboxFunctionRaw(ctx, "get", (...args) => {
                const key = String(ctx.vm.dump(args[0]))
                const value = headersMap[key] || headersMap[key.toLowerCase()]
                return value
                  ? ctx.scope.manage(ctx.vm.newString(value))
                  : ctx.vm.null
              })
              ctx.vm.setProp(headersObj, "get", getFn)

              ctx.vm.setProp(responseObj, "headers", headersObj)

              // Store the body bytes internally
              const bodyBytes = serializableResponse._bodyBytes || []

              // Store body bytes for sync access
              const bodyBytesArray = ctx.scope.manage(ctx.vm.newArray())
              for (let i = 0; i < bodyBytes.length; i++) {
                ctx.vm.setProp(
                  bodyBytesArray,
                  i,
                  ctx.scope.manage(ctx.vm.newNumber(bodyBytes[i]))
                )
              }
              ctx.vm.setProp(responseObj, "_bodyBytes", bodyBytesArray)

              // Track body consumption
              let fetchBodyConsumed = false
              ctx.vm.setProp(responseObj, "bodyUsed", ctx.vm.false)

              const markFetchBodyConsumed = () => {
                if (fetchBodyConsumed) return false
                fetchBodyConsumed = true
                ctx.vm.setProp(responseObj, "bodyUsed", ctx.vm.true)
                return true
              }

              // Add json() method - returns promise
              const jsonFn = defineSandboxFunctionRaw(ctx, "json", () => {
                const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                  if (!markFetchBodyConsumed()) {
                    reject(
                      ctx.scope.manage(
                        ctx.vm.newError({
                          name: "TypeError",
                          message: "Body has already been consumed",
                        })
                      )
                    )
                    return
                  }
                  try {
                    // Filter out null bytes (some interceptors add trailing null bytes)
                    const nullByteIndex = bodyBytes.indexOf(0)
                    const cleanBytes =
                      nullByteIndex >= 0
                        ? bodyBytes.slice(0, nullByteIndex)
                        : bodyBytes

                    const text = new TextDecoder().decode(
                      new Uint8Array(cleanBytes)
                    )
                    const parsed = JSON.parse(text)
                    const marshalledResult = marshalValue(parsed)
                    resolve(marshalledResult)
                  } catch (error) {
                    reject(
                      ctx.scope.manage(
                        ctx.vm.newError({
                          name: "JSONError",
                          message:
                            error instanceof Error
                              ? error.message
                              : "JSON parse failed",
                        })
                      )
                    )
                  }
                })

                return ctx.scope.manage(vmPromise).handle
              })

              ctx.vm.setProp(responseObj, "json", jsonFn)

              // Add text() method - returns promise
              const textFn = defineSandboxFunctionRaw(ctx, "text", () => {
                const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                  if (!markFetchBodyConsumed()) {
                    reject(
                      ctx.scope.manage(
                        ctx.vm.newError({
                          name: "TypeError",
                          message: "Body has already been consumed",
                        })
                      )
                    )
                    return
                  }
                  try {
                    // Filter out null bytes (some interceptors add trailing null bytes)
                    const nullByteIndex = bodyBytes.indexOf(0)
                    const cleanBytes =
                      nullByteIndex >= 0
                        ? bodyBytes.slice(0, nullByteIndex)
                        : bodyBytes

                    const text = new TextDecoder().decode(
                      new Uint8Array(cleanBytes)
                    )
                    const textHandle = ctx.scope.manage(
                      ctx.vm.newString(String(text))
                    )
                    resolve(textHandle)
                  } catch (error) {
                    reject(
                      ctx.scope.manage(
                        ctx.vm.newError({
                          name: "TextError",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Text decode failed",
                        })
                      )
                    )
                  }
                })

                return ctx.scope.manage(vmPromise).handle
              })

              ctx.vm.setProp(responseObj, "text", textFn)

              // Add arrayBuffer() method
              // Note: QuickJS doesn't support native ArrayBuffer, so we return a plain array
              // with byteLength property for compatibility
              const arrayBufferFn = defineSandboxFunctionRaw(
                ctx,
                "arrayBuffer",
                () => {
                  const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                    if (!markFetchBodyConsumed()) {
                      reject(
                        ctx.scope.manage(
                          ctx.vm.newError({
                            name: "TypeError",
                            message: "Body has already been consumed",
                          })
                        )
                      )
                      return
                    }
                    try {
                      const arr = ctx.scope.manage(ctx.vm.newArray())
                      bodyBytes.forEach((byte, i) => {
                        ctx.vm.setProp(
                          arr,
                          i,
                          ctx.scope.manage(ctx.vm.newNumber(byte))
                        )
                      })
                      // Add byteLength property for ArrayBuffer compatibility
                      ctx.vm.setProp(
                        arr,
                        "byteLength",
                        ctx.scope.manage(ctx.vm.newNumber(bodyBytes.length))
                      )
                      resolve(arr)
                    } catch (error) {
                      reject(
                        ctx.scope.manage(
                          ctx.vm.newError({
                            name: "TypeError",
                            message:
                              error instanceof Error
                                ? error.message
                                : "ArrayBuffer conversion failed",
                          })
                        )
                      )
                    }
                  })
                  return ctx.scope.manage(vmPromise).handle
                }
              )
              ctx.vm.setProp(responseObj, "arrayBuffer", arrayBufferFn)

              // Add blob() method
              const blobFn = defineSandboxFunctionRaw(ctx, "blob", () => {
                const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                  if (!markFetchBodyConsumed()) {
                    reject(
                      ctx.scope.manage(
                        ctx.vm.newError({
                          name: "TypeError",
                          message: "Body has already been consumed",
                        })
                      )
                    )
                    return
                  }
                  try {
                    const blobObj = ctx.scope.manage(ctx.vm.newObject())
                    ctx.vm.setProp(
                      blobObj,
                      "size",
                      ctx.scope.manage(ctx.vm.newNumber(bodyBytes.length))
                    )
                    ctx.vm.setProp(
                      blobObj,
                      "type",
                      ctx.scope.manage(
                        ctx.vm.newString("application/octet-stream")
                      )
                    )
                    const arr = ctx.scope.manage(ctx.vm.newArray())
                    bodyBytes.forEach((byte, i) => {
                      ctx.vm.setProp(
                        arr,
                        i,
                        ctx.scope.manage(ctx.vm.newNumber(byte))
                      )
                    })
                    ctx.vm.setProp(blobObj, "bytes", arr)
                    resolve(blobObj)
                  } catch (error) {
                    reject(
                      ctx.scope.manage(
                        ctx.vm.newError({
                          name: "TypeError",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Blob conversion failed",
                        })
                      )
                    )
                  }
                })
                return ctx.scope.manage(vmPromise).handle
              })
              ctx.vm.setProp(responseObj, "blob", blobFn)

              // Add formData() method
              const formDataFn = defineSandboxFunctionRaw(
                ctx,
                "formData",
                () => {
                  const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                    if (!markFetchBodyConsumed()) {
                      reject(
                        ctx.scope.manage(
                          ctx.vm.newError({
                            name: "TypeError",
                            message: "Body has already been consumed",
                          })
                        )
                      )
                      return
                    }
                    try {
                      const text = new TextDecoder().decode(
                        new Uint8Array(bodyBytes)
                      )
                      const formDataObj = ctx.scope.manage(ctx.vm.newObject())
                      const pairs = text.split("&")
                      for (const pair of pairs) {
                        const [key, value] = pair
                          .split("=")
                          .map(decodeURIComponent)
                        if (key) {
                          ctx.vm.setProp(
                            formDataObj,
                            key,
                            ctx.scope.manage(ctx.vm.newString(value || ""))
                          )
                        }
                      }
                      resolve(formDataObj)
                    } catch (error) {
                      reject(
                        ctx.scope.manage(
                          ctx.vm.newError({
                            name: "TypeError",
                            message:
                              error instanceof Error
                                ? error.message
                                : "FormData parsing failed",
                          })
                        )
                      )
                    }
                  })
                  return ctx.scope.manage(vmPromise).handle
                }
              )
              ctx.vm.setProp(responseObj, "formData", formDataFn)

              // Add clone() method for fetch response
              const cloneFetchResponseFn = defineSandboxFunctionRaw(
                ctx,
                "clone",
                () => {
                  // Can only clone if body hasn't been consumed
                  if (fetchBodyConsumed) {
                    const errorResponse = ctx.scope.manage(ctx.vm.newObject())
                    ctx.vm.setProp(errorResponse, "_error", ctx.vm.true)
                    return errorResponse
                  }

                  // Create a new response object
                  const clonedResponseObj = ctx.scope.manage(ctx.vm.newObject())

                  // Copy all basic properties
                  ctx.vm.setProp(
                    clonedResponseObj,
                    "status",
                    ctx.scope.manage(
                      ctx.vm.newNumber(serializableResponse.status)
                    )
                  )
                  ctx.vm.setProp(
                    clonedResponseObj,
                    "statusText",
                    ctx.scope.manage(
                      ctx.vm.newString(serializableResponse.statusText)
                    )
                  )
                  ctx.vm.setProp(
                    clonedResponseObj,
                    "ok",
                    serializableResponse.ok ? ctx.vm.true : ctx.vm.false
                  )

                  // Clone headers
                  const clonedHeadersObj = ctx.scope.manage(ctx.vm.newObject())
                  for (const [key, value] of Object.entries(headersMap)) {
                    ctx.vm.setProp(
                      clonedHeadersObj,
                      key,
                      ctx.scope.manage(ctx.vm.newString(String(value)))
                    )
                  }

                  // Add headers methods to cloned object
                  const clonedEntriesFn = defineSandboxFunctionRaw(
                    ctx,
                    "entries",
                    () => {
                      const entriesArray = ctx.scope.manage(ctx.vm.newArray())
                      let index = 0
                      for (const [key, value] of Object.entries(headersMap)) {
                        const entry = ctx.scope.manage(ctx.vm.newArray())
                        ctx.vm.setProp(
                          entry,
                          0,
                          ctx.scope.manage(ctx.vm.newString(key))
                        )
                        ctx.vm.setProp(
                          entry,
                          1,
                          ctx.scope.manage(ctx.vm.newString(String(value)))
                        )
                        ctx.vm.setProp(entriesArray, index++, entry)
                      }
                      return entriesArray
                    }
                  )
                  ctx.vm.setProp(clonedHeadersObj, "entries", clonedEntriesFn)

                  const clonedGetFn = defineSandboxFunctionRaw(
                    ctx,
                    "get",
                    (...args) => {
                      const key = String(ctx.vm.dump(args[0]))
                      const value =
                        headersMap[key] || headersMap[key.toLowerCase()]
                      return value
                        ? ctx.scope.manage(ctx.vm.newString(value))
                        : ctx.vm.null
                    }
                  )
                  ctx.vm.setProp(clonedHeadersObj, "get", clonedGetFn)

                  ctx.vm.setProp(clonedResponseObj, "headers", clonedHeadersObj)

                  // Clone body bytes
                  const clonedBodyBytes = [...bodyBytes]
                  let clonedBodyConsumed = false
                  ctx.vm.setProp(clonedResponseObj, "bodyUsed", ctx.vm.false)

                  const markClonedBodyConsumed = () => {
                    if (clonedBodyConsumed) return false
                    clonedBodyConsumed = true
                    ctx.vm.setProp(clonedResponseObj, "bodyUsed", ctx.vm.true)
                    return true
                  }

                  // Add all body methods to cloned response
                  const clonedJsonFn = defineSandboxFunctionRaw(
                    ctx,
                    "json",
                    () => {
                      const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                        if (!markClonedBodyConsumed()) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "TypeError",
                                message: "Body has already been consumed",
                              })
                            )
                          )
                          return
                        }
                        try {
                          const nullByteIndex = clonedBodyBytes.indexOf(0)
                          const cleanBytes =
                            nullByteIndex >= 0
                              ? clonedBodyBytes.slice(0, nullByteIndex)
                              : clonedBodyBytes

                          const text = new TextDecoder().decode(
                            new Uint8Array(cleanBytes)
                          )
                          const parsed = JSON.parse(text)
                          resolve(marshalValue(parsed))
                        } catch (error) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "JSONError",
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : "JSON parse failed",
                              })
                            )
                          )
                        }
                      })
                      return ctx.scope.manage(vmPromise).handle
                    }
                  )
                  ctx.vm.setProp(clonedResponseObj, "json", clonedJsonFn)

                  const clonedTextFn = defineSandboxFunctionRaw(
                    ctx,
                    "text",
                    () => {
                      const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                        if (!markClonedBodyConsumed()) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "TypeError",
                                message: "Body has already been consumed",
                              })
                            )
                          )
                          return
                        }
                        try {
                          const nullByteIndex = clonedBodyBytes.indexOf(0)
                          const cleanBytes =
                            nullByteIndex >= 0
                              ? clonedBodyBytes.slice(0, nullByteIndex)
                              : clonedBodyBytes

                          const text = new TextDecoder().decode(
                            new Uint8Array(cleanBytes)
                          )
                          resolve(
                            ctx.scope.manage(ctx.vm.newString(String(text)))
                          )
                        } catch (error) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "TextError",
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : "Text decode failed",
                              })
                            )
                          )
                        }
                      })
                      return ctx.scope.manage(vmPromise).handle
                    }
                  )
                  ctx.vm.setProp(clonedResponseObj, "text", clonedTextFn)

                  const clonedArrayBufferFn = defineSandboxFunctionRaw(
                    ctx,
                    "arrayBuffer",
                    () => {
                      const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                        if (!markClonedBodyConsumed()) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "TypeError",
                                message: "Body has already been consumed",
                              })
                            )
                          )
                          return
                        }
                        try {
                          const arr = ctx.scope.manage(ctx.vm.newArray())
                          clonedBodyBytes.forEach((byte, i) => {
                            ctx.vm.setProp(
                              arr,
                              i,
                              ctx.scope.manage(ctx.vm.newNumber(byte))
                            )
                          })
                          resolve(arr)
                        } catch (error) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "TypeError",
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : "ArrayBuffer conversion failed",
                              })
                            )
                          )
                        }
                      })
                      return ctx.scope.manage(vmPromise).handle
                    }
                  )
                  ctx.vm.setProp(
                    clonedResponseObj,
                    "arrayBuffer",
                    clonedArrayBufferFn
                  )

                  const clonedBlobFn = defineSandboxFunctionRaw(
                    ctx,
                    "blob",
                    () => {
                      const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                        if (!markClonedBodyConsumed()) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "TypeError",
                                message: "Body has already been consumed",
                              })
                            )
                          )
                          return
                        }
                        try {
                          const blobObj = ctx.scope.manage(ctx.vm.newObject())
                          ctx.vm.setProp(
                            blobObj,
                            "size",
                            ctx.scope.manage(
                              ctx.vm.newNumber(clonedBodyBytes.length)
                            )
                          )
                          ctx.vm.setProp(
                            blobObj,
                            "type",
                            ctx.scope.manage(
                              ctx.vm.newString("application/octet-stream")
                            )
                          )
                          const arr = ctx.scope.manage(ctx.vm.newArray())
                          clonedBodyBytes.forEach((byte, i) => {
                            ctx.vm.setProp(
                              arr,
                              i,
                              ctx.scope.manage(ctx.vm.newNumber(byte))
                            )
                          })
                          ctx.vm.setProp(blobObj, "bytes", arr)
                          resolve(blobObj)
                        } catch (error) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "TypeError",
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : "Blob conversion failed",
                              })
                            )
                          )
                        }
                      })
                      return ctx.scope.manage(vmPromise).handle
                    }
                  )
                  ctx.vm.setProp(clonedResponseObj, "blob", clonedBlobFn)

                  const clonedFormDataFn = defineSandboxFunctionRaw(
                    ctx,
                    "formData",
                    () => {
                      const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                        if (!markClonedBodyConsumed()) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "TypeError",
                                message: "Body has already been consumed",
                              })
                            )
                          )
                          return
                        }
                        try {
                          const nullByteIndex = clonedBodyBytes.indexOf(0)
                          const cleanBytes =
                            nullByteIndex >= 0
                              ? clonedBodyBytes.slice(0, nullByteIndex)
                              : clonedBodyBytes

                          const text = new TextDecoder().decode(
                            new Uint8Array(cleanBytes)
                          )
                          const formDataObj = ctx.scope.manage(
                            ctx.vm.newObject()
                          )
                          const pairs = text.split("&")
                          for (const pair of pairs) {
                            const [key, value] = pair
                              .split("=")
                              .map(decodeURIComponent)
                            if (key) {
                              ctx.vm.setProp(
                                formDataObj,
                                key,
                                ctx.scope.manage(ctx.vm.newString(value || ""))
                              )
                            }
                          }
                          resolve(formDataObj)
                        } catch (error) {
                          reject(
                            ctx.scope.manage(
                              ctx.vm.newError({
                                name: "TypeError",
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : "FormData parsing failed",
                              })
                            )
                          )
                        }
                      })
                      return ctx.scope.manage(vmPromise).handle
                    }
                  )
                  ctx.vm.setProp(
                    clonedResponseObj,
                    "formData",
                    clonedFormDataFn
                  )

                  // Add clone() method to cloned response (recursively)
                  ctx.vm.setProp(
                    clonedResponseObj,
                    "clone",
                    cloneFetchResponseFn
                  )

                  return clonedResponseObj
                }
              )
              ctx.vm.setProp(responseObj, "clone", cloneFetchResponseFn)

              resolve(responseObj)
            })
            .catch((error) => {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "FetchError",
                    message:
                      error instanceof Error ? error.message : "Fetch failed",
                  })
                )
              )
            })
        })
      )

      return promiseHandle.handle
    })

    // Add fetch to global scope
    ctx.vm.setProp(ctx.vm.global, "fetch", fetchFn)

    // ========================================================================
    // Headers Class Implementation (wraps native Headers)
    // ========================================================================
    // Helper function to create a Headers instance (called from sandbox)
    const createHeadersInstance = defineSandboxFunctionRaw(
      ctx,
      "__createHeadersInstance",
      (initHandle) => {
        const init = initHandle ? ctx.vm.dump(initHandle) : undefined
        const nativeHeaders = new globalThis.Headers(init as HeadersInit)

        const headersInstance = ctx.scope.manage(ctx.vm.newObject())

        // append(name, value) - delegates to native Headers
        const appendFn = defineSandboxFunctionRaw(
          ctx,
          "append",
          (...appendArgs) => {
            const name = String(ctx.vm.dump(appendArgs[0]))
            const value = String(ctx.vm.dump(appendArgs[1]))
            nativeHeaders.append(name, value)
            return ctx.vm.undefined
          }
        )
        ctx.vm.setProp(headersInstance, "append", appendFn)

        // delete(name) - delegates to native Headers
        const deleteFn = defineSandboxFunctionRaw(
          ctx,
          "delete",
          (...deleteArgs) => {
            const name = String(ctx.vm.dump(deleteArgs[0]))
            nativeHeaders.delete(name)
            return ctx.vm.undefined
          }
        )
        ctx.vm.setProp(headersInstance, "delete", deleteFn)

        // get(name) - delegates to native Headers
        const getFn = defineSandboxFunctionRaw(ctx, "get", (...getArgs) => {
          const name = String(ctx.vm.dump(getArgs[0]))
          const value = nativeHeaders.get(name)
          return value !== null
            ? ctx.scope.manage(ctx.vm.newString(value))
            : ctx.vm.null
        })
        ctx.vm.setProp(headersInstance, "get", getFn)

        // has(name) - delegates to native Headers
        const hasFn = defineSandboxFunctionRaw(ctx, "has", (...hasArgs) => {
          const name = String(ctx.vm.dump(hasArgs[0]))
          return nativeHeaders.has(name) ? ctx.vm.true : ctx.vm.false
        })
        ctx.vm.setProp(headersInstance, "has", hasFn)

        // set(name, value) - delegates to native Headers
        const setFn = defineSandboxFunctionRaw(ctx, "set", (...setArgs) => {
          const name = String(ctx.vm.dump(setArgs[0]))
          const value = String(ctx.vm.dump(setArgs[1]))
          nativeHeaders.set(name, value)
          return ctx.vm.undefined
        })
        ctx.vm.setProp(headersInstance, "set", setFn)

        // forEach(callbackfn) - delegates to native Headers
        const forEachFn = defineSandboxFunctionRaw(
          ctx,
          "forEach",
          (...forEachArgs) => {
            const callback = forEachArgs[0]
            nativeHeaders.forEach((value, key) => {
              ctx.vm.callFunction(
                callback,
                ctx.vm.undefined,
                ctx.scope.manage(ctx.vm.newString(value)),
                ctx.scope.manage(ctx.vm.newString(key)),
                headersInstance
              )
            })
            return ctx.vm.undefined
          }
        )
        ctx.vm.setProp(headersInstance, "forEach", forEachFn)

        // entries() - delegates to native Headers
        const entriesFn = defineSandboxFunctionRaw(ctx, "entries", () => {
          const entriesArray = ctx.scope.manage(ctx.vm.newArray())
          let index = 0
          for (const [key, value] of (
            nativeHeaders as HeadersWithIterators
          ).entries()) {
            const entry = ctx.scope.manage(ctx.vm.newArray())
            ctx.vm.setProp(entry, 0, ctx.scope.manage(ctx.vm.newString(key)))
            ctx.vm.setProp(entry, 1, ctx.scope.manage(ctx.vm.newString(value)))
            ctx.vm.setProp(entriesArray, index++, entry)
          }
          return entriesArray
        })
        ctx.vm.setProp(headersInstance, "entries", entriesFn)

        // keys() - delegates to native Headers
        const keysFn = defineSandboxFunctionRaw(ctx, "keys", () => {
          const keysArray = ctx.scope.manage(ctx.vm.newArray())
          let index = 0
          for (const key of (nativeHeaders as HeadersWithIterators).keys()) {
            ctx.vm.setProp(
              keysArray,
              index++,
              ctx.scope.manage(ctx.vm.newString(key))
            )
          }
          return keysArray
        })
        ctx.vm.setProp(headersInstance, "keys", keysFn)

        // values() - delegates to native Headers
        const valuesFn = defineSandboxFunctionRaw(ctx, "values", () => {
          const valuesArray = ctx.scope.manage(ctx.vm.newArray())
          let index = 0
          for (const value of (
            nativeHeaders as HeadersWithIterators
          ).values()) {
            ctx.vm.setProp(
              valuesArray,
              index++,
              ctx.scope.manage(ctx.vm.newString(value))
            )
          }
          return valuesArray
        })
        ctx.vm.setProp(headersInstance, "values", valuesFn)

        // Add a special marker and toObject method for fetch compatibility
        ctx.vm.setProp(headersInstance, "__isHoppHeaders", ctx.vm.true)

        const toObjectFn = defineSandboxFunctionRaw(ctx, "toObject", () => {
          const obj = ctx.scope.manage(ctx.vm.newObject())
          for (const [key, value] of (
            nativeHeaders as HeadersWithIterators
          ).entries()) {
            ctx.vm.setProp(obj, key, ctx.scope.manage(ctx.vm.newString(value)))
          }
          return obj
        })
        ctx.vm.setProp(headersInstance, "toObject", toObjectFn)

        return headersInstance
      }
    )

    // Set the helper on global scope (keep it, don't remove)
    ctx.vm.setProp(
      ctx.vm.global,
      "__createHeadersInstance",
      createHeadersInstance
    )

    // Define the Headers constructor as actual JavaScript in the sandbox
    // This ensures it's recognized as a proper constructor
    const headersCtorResult = ctx.vm.evalCode(`
      (function() {
        globalThis.Headers = function Headers(init) {
          return __createHeadersInstance(init)
        }
        return true
      })()
    `)

    if (headersCtorResult.error) {
      console.error(
        "[FETCH] Failed to define Headers constructor:",
        ctx.vm.dump(headersCtorResult.error)
      )
      headersCtorResult.error.dispose()
    } else {
      headersCtorResult.value?.dispose()
    }

    // ========================================================================
    // Request Class Implementation (wraps native Request)
    // ========================================================================
    const RequestClass = defineSandboxFunctionRaw(ctx, "Request", (...args) => {
      const input = ctx.vm.dump(args[0])
      const init = args.length > 1 ? ctx.vm.dump(args[1]) : {}

      // Create native Request instance
      const nativeRequest = new globalThis.Request(
        input as RequestInfo,
        init as RequestInit
      )

      const requestInstance = ctx.scope.manage(ctx.vm.newObject())

      // url property - strip trailing slash if original didn't have one
      let url = nativeRequest.url
      if (
        typeof input === "string" &&
        !input.endsWith("/") &&
        url.endsWith("/")
      ) {
        url = url.slice(0, -1)
      }
      ctx.vm.setProp(
        requestInstance,
        "url",
        ctx.scope.manage(ctx.vm.newString(url))
      )

      // method property
      ctx.vm.setProp(
        requestInstance,
        "method",
        ctx.scope.manage(ctx.vm.newString(nativeRequest.method))
      )

      // headers property - create simple object (Headers class can be used separately if needed)
      const headersObj = ctx.scope.manage(ctx.vm.newObject())
      for (const [key, value] of (
        nativeRequest.headers as HeadersWithIterators
      ).entries()) {
        ctx.vm.setProp(
          headersObj,
          key,
          ctx.scope.manage(ctx.vm.newString(value))
        )
      }
      ctx.vm.setProp(requestInstance, "headers", headersObj)

      // body property (simplified - most use cases don't need body in Request objects)
      ctx.vm.setProp(requestInstance, "body", ctx.vm.null)

      // Store reference to native Request for fetch() to access method/body/headers
      // This is a hidden property that won't be enumerable but allows fetch() to properly handle Request objects
      ctx.vm.setProp(
        requestInstance,
        "__nativeRequest",
        ctx.scope.manage(ctx.vm.newObject()) // Placeholder - will be replaced in fetch() with actual native Request
      )
      // Store the actual native request data for fetch to use
      ;(requestInstance as any).__nativeRequestData = nativeRequest

      // bodyUsed property - always false since we don't support reading request bodies yet
      ctx.vm.setProp(requestInstance, "bodyUsed", ctx.vm.false)

      // mode property
      ctx.vm.setProp(
        requestInstance,
        "mode",
        ctx.scope.manage(ctx.vm.newString(nativeRequest.mode))
      )

      // credentials property
      ctx.vm.setProp(
        requestInstance,
        "credentials",
        ctx.scope.manage(ctx.vm.newString(nativeRequest.credentials))
      )

      // cache property
      ctx.vm.setProp(
        requestInstance,
        "cache",
        ctx.scope.manage(ctx.vm.newString(nativeRequest.cache))
      )

      // redirect property
      ctx.vm.setProp(
        requestInstance,
        "redirect",
        ctx.scope.manage(ctx.vm.newString(nativeRequest.redirect))
      )

      // referrer property
      ctx.vm.setProp(
        requestInstance,
        "referrer",
        ctx.scope.manage(ctx.vm.newString(nativeRequest.referrer))
      )

      // integrity property
      ctx.vm.setProp(
        requestInstance,
        "integrity",
        ctx.scope.manage(ctx.vm.newString(nativeRequest.integrity))
      )

      // clone() method - delegates to native Request
      const cloneFn = defineSandboxFunctionRaw(ctx, "clone", () => {
        const clonedNativeRequest = nativeRequest.clone()
        const clonedRequest = ctx.scope.manage(ctx.vm.newObject())

        // Copy all properties from cloned native Request
        ctx.vm.setProp(
          clonedRequest,
          "url",
          ctx.scope.manage(ctx.vm.newString(clonedNativeRequest.url))
        )
        ctx.vm.setProp(
          clonedRequest,
          "method",
          ctx.scope.manage(ctx.vm.newString(clonedNativeRequest.method))
        )
        ctx.vm.setProp(clonedRequest, "body", ctx.vm.null)
        ctx.vm.setProp(clonedRequest, "bodyUsed", ctx.vm.false)
        ctx.vm.setProp(
          clonedRequest,
          "mode",
          ctx.scope.manage(ctx.vm.newString(clonedNativeRequest.mode))
        )
        ctx.vm.setProp(
          clonedRequest,
          "credentials",
          ctx.scope.manage(ctx.vm.newString(clonedNativeRequest.credentials))
        )
        ctx.vm.setProp(
          clonedRequest,
          "cache",
          ctx.scope.manage(ctx.vm.newString(clonedNativeRequest.cache))
        )
        ctx.vm.setProp(
          clonedRequest,
          "redirect",
          ctx.scope.manage(ctx.vm.newString(clonedNativeRequest.redirect))
        )
        ctx.vm.setProp(
          clonedRequest,
          "referrer",
          ctx.scope.manage(ctx.vm.newString(clonedNativeRequest.referrer))
        )
        ctx.vm.setProp(
          clonedRequest,
          "integrity",
          ctx.scope.manage(ctx.vm.newString(clonedNativeRequest.integrity))
        )

        return clonedRequest
      })
      ctx.vm.setProp(requestInstance, "clone", cloneFn)

      return requestInstance
    })

    // Set helper on global and define Request constructor in sandbox
    ctx.vm.setProp(ctx.vm.global, "__createRequestInstance", RequestClass)
    const requestCtorResult = ctx.vm.evalCode(`
      (function() {
        globalThis.Request = function Request(input, init) {
          return __createRequestInstance(input, init)
        }
        return true
      })()
    `)
    if (requestCtorResult.error) {
      console.error(
        "[FETCH] Failed to define Request constructor:",
        ctx.vm.dump(requestCtorResult.error)
      )
      requestCtorResult.error.dispose()
    } else {
      requestCtorResult.value?.dispose()
    }

    // ========================================================================
    // Response Class Implementation
    // ========================================================================
    const ResponseClass = defineSandboxFunctionRaw(
      ctx,
      "Response",
      (...args) => {
        const body = args.length > 0 ? ctx.vm.dump(args[0]) : null
        const init = args.length > 1 ? ctx.vm.dump(args[1]) : {}

        const responseInstance = ctx.scope.manage(ctx.vm.newObject())

        // Set status property
        const status = init.status || 200
        ctx.vm.setProp(
          responseInstance,
          "status",
          ctx.scope.manage(ctx.vm.newNumber(status))
        )

        // Set statusText property
        ctx.vm.setProp(
          responseInstance,
          "statusText",
          ctx.scope.manage(ctx.vm.newString(init.statusText || ""))
        )

        // Set ok property (true for 200-299 status codes)
        const ok = status >= 200 && status < 300
        ctx.vm.setProp(responseInstance, "ok", ok ? ctx.vm.true : ctx.vm.false)

        // Set headers property - convert HeadersInit to plain object with get() method
        // Handles plain objects, arrays of tuples, and Headers instances
        const responseHeadersObj = ctx.scope.manage(ctx.vm.newObject())
        const headersMap: Record<string, string> = {}

        // Process headers based on type (HeadersInit: Headers | string[][] | Record<string, string>)
        if (init.headers) {
          if (Array.isArray(init.headers)) {
            // Array of tuples: [["key", "value"], ...]
            for (const [key, value] of init.headers) {
              headersMap[String(key).toLowerCase()] = String(value)
            }
          } else if (typeof init.headers === "object") {
            // Plain object or Headers instance - iterate with Object.entries
            for (const [key, value] of Object.entries(init.headers)) {
              headersMap[String(key).toLowerCase()] = String(value)
            }
          }
        }

        // Set header properties
        for (const [key, value] of Object.entries(headersMap)) {
          ctx.vm.setProp(
            responseHeadersObj,
            key,
            ctx.scope.manage(ctx.vm.newString(String(value)))
          )
        }

        // Add get() method for Headers API compatibility
        const getHeaderFn = defineSandboxFunctionRaw(ctx, "get", (...args) => {
          const key = String(ctx.vm.dump(args[0])).toLowerCase()
          const value = headersMap[key]
          return value ? ctx.scope.manage(ctx.vm.newString(value)) : ctx.vm.null
        })
        ctx.vm.setProp(responseHeadersObj, "get", getHeaderFn)

        // Add has() method
        const hasHeaderFn = defineSandboxFunctionRaw(ctx, "has", (...args) => {
          const key = String(ctx.vm.dump(args[0])).toLowerCase()
          return headersMap[key] !== undefined ? ctx.vm.true : ctx.vm.false
        })
        ctx.vm.setProp(responseHeadersObj, "has", hasHeaderFn)

        ctx.vm.setProp(responseInstance, "headers", responseHeadersObj)

        // Set type property
        ctx.vm.setProp(
          responseInstance,
          "type",
          ctx.scope.manage(ctx.vm.newString(init.type || "default"))
        )

        // Set url property
        ctx.vm.setProp(
          responseInstance,
          "url",
          ctx.scope.manage(ctx.vm.newString(init.url || ""))
        )

        // Set redirected property
        ctx.vm.setProp(
          responseInstance,
          "redirected",
          init.redirected ? ctx.vm.true : ctx.vm.false
        )

        // Store body internally (normalizing supported types to byte array)
        let bodyBytes: number[] = []
        if (body != null) {
          if (typeof body === "string") {
            bodyBytes = Array.from(new TextEncoder().encode(body))
          } else if (body instanceof Uint8Array) {
            bodyBytes = Array.from(body)
          } else if (body instanceof ArrayBuffer) {
            bodyBytes = Array.from(new Uint8Array(body))
          } else if (body instanceof URLSearchParams) {
            bodyBytes = Array.from(new TextEncoder().encode(body.toString()))
          } else if (body instanceof Date) {
            bodyBytes = Array.from(new TextEncoder().encode(body.toISOString()))
          } else if (body instanceof RegExp) {
            bodyBytes = Array.from(new TextEncoder().encode(body.toString()))
          } else if (typeof body === "object") {
            // Fallback: JSON stringify generic object (FormData and unsupported complex structures will be stringified)
            try {
              const jsonString = JSON.stringify(body)
              bodyBytes = Array.from(new TextEncoder().encode(jsonString))
            } catch (_) {
              // If object isn't JSON-serializable, fall back to its string representation
              bodyBytes = Array.from(new TextEncoder().encode(String(body)))
            }
          }
        }

        // Track body consumption state
        let bodyConsumed = false

        // bodyUsed getter property
        ctx.vm.setProp(responseInstance, "bodyUsed", ctx.vm.false)

        // Helper to mark body as consumed
        const markBodyConsumed = () => {
          if (bodyConsumed) {
            return false // Already consumed
          }
          bodyConsumed = true
          ctx.vm.setProp(responseInstance, "bodyUsed", ctx.vm.true)
          return true
        }

        // json() method
        const jsonFn = defineSandboxFunctionRaw(ctx, "json", () => {
          const vmPromise = ctx.vm.newPromise((resolve, reject) => {
            if (!markBodyConsumed()) {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "TypeError",
                    message: "Body has already been consumed",
                  })
                )
              )
              return
            }
            try {
              const text = new TextDecoder().decode(new Uint8Array(bodyBytes))
              const parsed = JSON.parse(text)
              resolve(marshalValue(parsed))
            } catch (error) {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "JSONError",
                    message:
                      error instanceof Error
                        ? error.message
                        : "JSON parse failed",
                  })
                )
              )
            }
          })
          return ctx.scope.manage(vmPromise).handle
        })
        ctx.vm.setProp(responseInstance, "json", jsonFn)

        // text() method
        const textFn = defineSandboxFunctionRaw(ctx, "text", () => {
          const vmPromise = ctx.vm.newPromise((resolve, reject) => {
            if (!markBodyConsumed()) {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "TypeError",
                    message: "Body has already been consumed",
                  })
                )
              )
              return
            }
            try {
              const text = new TextDecoder().decode(new Uint8Array(bodyBytes))
              resolve(ctx.scope.manage(ctx.vm.newString(text)))
            } catch (error) {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "TextError",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Text decode failed",
                  })
                )
              )
            }
          })
          return ctx.scope.manage(vmPromise).handle
        })
        ctx.vm.setProp(responseInstance, "text", textFn)

        // arrayBuffer() method
        // Note: QuickJS doesn't support native ArrayBuffer, so we return a plain array
        // with byteLength property for compatibility
        const arrayBufferFn = defineSandboxFunctionRaw(
          ctx,
          "arrayBuffer",
          () => {
            const vmPromise = ctx.vm.newPromise((resolve, reject) => {
              if (!markBodyConsumed()) {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "TypeError",
                      message: "Body has already been consumed",
                    })
                  )
                )
                return
              }
              try {
                // Create a VM array with the byte values
                const arr = ctx.scope.manage(ctx.vm.newArray())
                bodyBytes.forEach((byte, i) => {
                  ctx.vm.setProp(
                    arr,
                    i,
                    ctx.scope.manage(ctx.vm.newNumber(byte))
                  )
                })
                // Add byteLength property for ArrayBuffer compatibility
                ctx.vm.setProp(
                  arr,
                  "byteLength",
                  ctx.scope.manage(ctx.vm.newNumber(bodyBytes.length))
                )
                resolve(arr)
              } catch (error) {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "TypeError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "ArrayBuffer conversion failed",
                    })
                  )
                )
              }
            })
            return ctx.scope.manage(vmPromise).handle
          }
        )
        ctx.vm.setProp(responseInstance, "arrayBuffer", arrayBufferFn)

        // blob() method
        const blobFn = defineSandboxFunctionRaw(ctx, "blob", () => {
          const vmPromise = ctx.vm.newPromise((resolve, reject) => {
            if (!markBodyConsumed()) {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "TypeError",
                    message: "Body has already been consumed",
                  })
                )
              )
              return
            }
            try {
              // Create a simple blob-like object with byte data
              const blobObj = ctx.scope.manage(ctx.vm.newObject())
              ctx.vm.setProp(
                blobObj,
                "size",
                ctx.scope.manage(ctx.vm.newNumber(bodyBytes.length))
              )
              ctx.vm.setProp(
                blobObj,
                "type",
                ctx.scope.manage(ctx.vm.newString("application/octet-stream"))
              )
              // Store bytes as array
              const arr = ctx.scope.manage(ctx.vm.newArray())
              bodyBytes.forEach((byte, i) => {
                ctx.vm.setProp(arr, i, ctx.scope.manage(ctx.vm.newNumber(byte)))
              })
              ctx.vm.setProp(blobObj, "bytes", arr)
              resolve(blobObj)
            } catch (error) {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "TypeError",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Blob conversion failed",
                  })
                )
              )
            }
          })
          return ctx.scope.manage(vmPromise).handle
        })
        ctx.vm.setProp(responseInstance, "blob", blobFn)

        // formData() method
        const formDataFn = defineSandboxFunctionRaw(ctx, "formData", () => {
          const vmPromise = ctx.vm.newPromise((resolve, reject) => {
            if (!markBodyConsumed()) {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "TypeError",
                    message: "Body has already been consumed",
                  })
                )
              )
              return
            }
            try {
              // Parse as URL-encoded form data or multipart
              const text = new TextDecoder().decode(new Uint8Array(bodyBytes))
              const formDataObj = ctx.scope.manage(ctx.vm.newObject())

              // Simple URL-encoded parsing
              const pairs = text.split("&")
              for (const pair of pairs) {
                const [key, value] = pair.split("=").map(decodeURIComponent)
                if (key) {
                  ctx.vm.setProp(
                    formDataObj,
                    key,
                    ctx.scope.manage(ctx.vm.newString(value || ""))
                  )
                }
              }

              resolve(formDataObj)
            } catch (error) {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "TypeError",
                    message:
                      error instanceof Error
                        ? error.message
                        : "FormData parsing failed",
                  })
                )
              )
            }
          })
          return ctx.scope.manage(vmPromise).handle
        })
        ctx.vm.setProp(responseInstance, "formData", formDataFn)

        // clone() method
        const cloneFn = defineSandboxFunctionRaw(ctx, "clone", () => {
          // Can only clone if body hasn't been consumed
          if (bodyConsumed) {
            // In QuickJS, we can't throw synchronously from sandbox function
            // Return an error response marked as unusable
            const errorResponse = ctx.scope.manage(ctx.vm.newObject())
            ctx.vm.setProp(errorResponse, "_error", ctx.vm.true)
            return errorResponse
          }

          // Create a new response instance manually
          const clonedResponse = ctx.scope.manage(ctx.vm.newObject())

          // Copy all properties
          ctx.vm.setProp(
            clonedResponse,
            "status",
            ctx.scope.manage(ctx.vm.newNumber(status))
          )
          ctx.vm.setProp(
            clonedResponse,
            "statusText",
            ctx.scope.manage(ctx.vm.newString(init.statusText || ""))
          )
          ctx.vm.setProp(clonedResponse, "ok", ok ? ctx.vm.true : ctx.vm.false)

          // Clone headers - same logic as Response constructor
          const clonedResponseHeadersObj = ctx.scope.manage(ctx.vm.newObject())
          const clonedHeadersMap: Record<string, string> = {}

          if (init.headers) {
            if (Array.isArray(init.headers)) {
              for (const [key, value] of init.headers) {
                clonedHeadersMap[String(key).toLowerCase()] = String(value)
              }
            } else if (typeof init.headers === "object") {
              for (const [key, value] of Object.entries(init.headers)) {
                clonedHeadersMap[String(key).toLowerCase()] = String(value)
              }
            }
          }

          for (const [key, value] of Object.entries(clonedHeadersMap)) {
            ctx.vm.setProp(
              clonedResponseHeadersObj,
              key,
              ctx.scope.manage(ctx.vm.newString(String(value)))
            )
          }

          // Add get() and has() methods
          const clonedGetFn = defineSandboxFunctionRaw(
            ctx,
            "get",
            (...args) => {
              const key = String(ctx.vm.dump(args[0])).toLowerCase()
              const value = clonedHeadersMap[key]
              return value
                ? ctx.scope.manage(ctx.vm.newString(value))
                : ctx.vm.null
            }
          )
          ctx.vm.setProp(clonedResponseHeadersObj, "get", clonedGetFn)

          const clonedHasFn = defineSandboxFunctionRaw(
            ctx,
            "has",
            (...args) => {
              const key = String(ctx.vm.dump(args[0])).toLowerCase()
              return clonedHeadersMap[key] !== undefined
                ? ctx.vm.true
                : ctx.vm.false
            }
          )
          ctx.vm.setProp(clonedResponseHeadersObj, "has", clonedHasFn)

          ctx.vm.setProp(clonedResponse, "headers", clonedResponseHeadersObj)

          // Copy other properties
          ctx.vm.setProp(
            clonedResponse,
            "type",
            ctx.scope.manage(ctx.vm.newString(init.type || "default"))
          )
          ctx.vm.setProp(
            clonedResponse,
            "url",
            ctx.scope.manage(ctx.vm.newString(init.url || ""))
          )
          ctx.vm.setProp(
            clonedResponse,
            "redirected",
            init.redirected ? ctx.vm.true : ctx.vm.false
          )

          // Clone body bytes array and consumption state
          const clonedBodyBytes = [...bodyBytes]
          let clonedBodyConsumed = false

          // bodyUsed property for cloned response
          ctx.vm.setProp(clonedResponse, "bodyUsed", ctx.vm.false)

          // Helper for cloned response
          const markClonedBodyConsumed = () => {
            if (clonedBodyConsumed) return false
            clonedBodyConsumed = true
            ctx.vm.setProp(clonedResponse, "bodyUsed", ctx.vm.true)
            return true
          }

          // Add all body methods to cloned response
          const clonedJsonFn = defineSandboxFunctionRaw(ctx, "json", () => {
            const vmPromise = ctx.vm.newPromise((resolve, reject) => {
              if (!markClonedBodyConsumed()) {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "TypeError",
                      message: "Body has already been consumed",
                    })
                  )
                )
                return
              }
              try {
                const text = new TextDecoder().decode(
                  new Uint8Array(clonedBodyBytes)
                )
                const parsed = JSON.parse(text)
                resolve(marshalValue(parsed))
              } catch (error) {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "JSONError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "JSON parse failed",
                    })
                  )
                )
              }
            })
            return ctx.scope.manage(vmPromise).handle
          })
          ctx.vm.setProp(clonedResponse, "json", clonedJsonFn)

          const clonedTextFn = defineSandboxFunctionRaw(ctx, "text", () => {
            const vmPromise = ctx.vm.newPromise((resolve, reject) => {
              if (!markClonedBodyConsumed()) {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "TypeError",
                      message: "Body has already been consumed",
                    })
                  )
                )
                return
              }
              try {
                const text = new TextDecoder().decode(
                  new Uint8Array(clonedBodyBytes)
                )
                resolve(ctx.scope.manage(ctx.vm.newString(text)))
              } catch (error) {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "TextError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Text decode failed",
                    })
                  )
                )
              }
            })
            return ctx.scope.manage(vmPromise).handle
          })
          ctx.vm.setProp(clonedResponse, "text", clonedTextFn)

          const clonedArrayBufferFn = defineSandboxFunctionRaw(
            ctx,
            "arrayBuffer",
            () => {
              const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                if (!markClonedBodyConsumed()) {
                  reject(
                    ctx.scope.manage(
                      ctx.vm.newError({
                        name: "TypeError",
                        message: "Body has already been consumed",
                      })
                    )
                  )
                  return
                }
                try {
                  const arr = ctx.scope.manage(ctx.vm.newArray())
                  clonedBodyBytes.forEach((byte, i) => {
                    ctx.vm.setProp(
                      arr,
                      i,
                      ctx.scope.manage(ctx.vm.newNumber(byte))
                    )
                  })
                  resolve(arr)
                } catch (error) {
                  reject(
                    ctx.scope.manage(
                      ctx.vm.newError({
                        name: "TypeError",
                        message:
                          error instanceof Error
                            ? error.message
                            : "ArrayBuffer conversion failed",
                      })
                    )
                  )
                }
              })
              return ctx.scope.manage(vmPromise).handle
            }
          )
          ctx.vm.setProp(clonedResponse, "arrayBuffer", clonedArrayBufferFn)

          const clonedBlobFn = defineSandboxFunctionRaw(ctx, "blob", () => {
            const vmPromise = ctx.vm.newPromise((resolve, reject) => {
              if (!markClonedBodyConsumed()) {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "TypeError",
                      message: "Body has already been consumed",
                    })
                  )
                )
                return
              }
              try {
                const blobObj = ctx.scope.manage(ctx.vm.newObject())
                ctx.vm.setProp(
                  blobObj,
                  "size",
                  ctx.scope.manage(ctx.vm.newNumber(clonedBodyBytes.length))
                )
                ctx.vm.setProp(
                  blobObj,
                  "type",
                  ctx.scope.manage(ctx.vm.newString("application/octet-stream"))
                )
                const arr = ctx.scope.manage(ctx.vm.newArray())
                clonedBodyBytes.forEach((byte, i) => {
                  ctx.vm.setProp(
                    arr,
                    i,
                    ctx.scope.manage(ctx.vm.newNumber(byte))
                  )
                })
                ctx.vm.setProp(blobObj, "bytes", arr)
                resolve(blobObj)
              } catch (error) {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "TypeError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Blob conversion failed",
                    })
                  )
                )
              }
            })
            return ctx.scope.manage(vmPromise).handle
          })
          ctx.vm.setProp(clonedResponse, "blob", clonedBlobFn)

          const clonedFormDataFn = defineSandboxFunctionRaw(
            ctx,
            "formData",
            () => {
              const vmPromise = ctx.vm.newPromise((resolve, reject) => {
                if (!markClonedBodyConsumed()) {
                  reject(
                    ctx.scope.manage(
                      ctx.vm.newError({
                        name: "TypeError",
                        message: "Body has already been consumed",
                      })
                    )
                  )
                  return
                }
                try {
                  const text = new TextDecoder().decode(
                    new Uint8Array(clonedBodyBytes)
                  )
                  const formDataObj = ctx.scope.manage(ctx.vm.newObject())
                  const pairs = text.split("&")
                  for (const pair of pairs) {
                    const [key, value] = pair.split("=").map(decodeURIComponent)
                    if (key) {
                      ctx.vm.setProp(
                        formDataObj,
                        key,
                        ctx.scope.manage(ctx.vm.newString(value || ""))
                      )
                    }
                  }
                  resolve(formDataObj)
                } catch (error) {
                  reject(
                    ctx.scope.manage(
                      ctx.vm.newError({
                        name: "TypeError",
                        message:
                          error instanceof Error
                            ? error.message
                            : "FormData parsing failed",
                      })
                    )
                  )
                }
              })
              return ctx.scope.manage(vmPromise).handle
            }
          )
          ctx.vm.setProp(clonedResponse, "formData", clonedFormDataFn)

          // Add clone() method to cloned response
          const nestedCloneFn = cloneFn // Reuse the same clone function
          ctx.vm.setProp(clonedResponse, "clone", nestedCloneFn)

          return clonedResponse
        })
        ctx.vm.setProp(responseInstance, "clone", cloneFn)

        return responseInstance
      }
    )

    // Set helper on global and define Response constructor in sandbox
    ctx.vm.setProp(ctx.vm.global, "__createResponseInstance", ResponseClass)
    const responseCtorResult = ctx.vm.evalCode(`
      (function() {
        globalThis.Response = function Response(body, init) {
          return __createResponseInstance(body, init)
        }
        return true
      })()
    `)
    if (responseCtorResult.error) {
      console.error(
        "[FETCH] Failed to define Response constructor:",
        ctx.vm.dump(responseCtorResult.error)
      )
      responseCtorResult.error.dispose()
    } else {
      responseCtorResult.value?.dispose()
    }

    // ========================================================================
    // AbortController Class Implementation
    // ========================================================================
    const AbortControllerClass = defineSandboxFunctionRaw(
      ctx,
      "AbortController",
      () => {
        const controllerInstance = ctx.scope.manage(ctx.vm.newObject())

        // Create AbortSignal
        const signalInstance = ctx.scope.manage(ctx.vm.newObject())
        ctx.vm.setProp(signalInstance, "aborted", ctx.vm.false)

        // Store abort listeners - use an array to store handles that we DON'T dispose
        // These handles need to stay alive until abort() is called
        const abortListeners: Array<{ handle: any; disposed: boolean }> = []

        // addEventListener method for signal
        const addEventListenerFn = defineSandboxFunctionRaw(
          ctx,
          "addEventListener",
          (...listenerArgs) => {
            const eventType = ctx.vm.dump(listenerArgs[0])
            if (eventType === "abort") {
              // The handle passed to us is managed by the caller's scope
              // We need to create our own reference that won't be auto-disposed
              const listenerHandle = listenerArgs[1]
              const dupedHandle = listenerHandle.dup()
              abortListeners.push({ handle: dupedHandle, disposed: false })
            }
            return ctx.vm.undefined
          }
        )
        ctx.vm.setProp(signalInstance, "addEventListener", addEventListenerFn)

        // Set signal property on controller
        ctx.vm.setProp(controllerInstance, "signal", signalInstance)

        // abort() method
        const abortFn = defineSandboxFunctionRaw(ctx, "abort", () => {
          // Mark signal as aborted
          ctx.vm.setProp(signalInstance, "aborted", ctx.vm.true)

          // Call all abort listeners
          for (let i = 0; i < abortListeners.length; i++) {
            const listenerInfo = abortListeners[i]
            if (!listenerInfo.disposed) {
              const result = ctx.vm.callFunction(
                listenerInfo.handle,
                ctx.vm.undefined
              )
              if (result.error) {
                console.error(
                  "[ABORT] Listener error:",
                  ctx.vm.dump(result.error)
                )
                result.error.dispose()
              } else {
                result.value.dispose()
              }
              // Dispose the handle after calling it
              listenerInfo.handle.dispose()
              listenerInfo.disposed = true
            }
          }

          return ctx.vm.undefined
        })
        ctx.vm.setProp(controllerInstance, "abort", abortFn)

        return controllerInstance
      }
    )

    // Set helper on global and define AbortController constructor in sandbox
    ctx.vm.setProp(
      ctx.vm.global,
      "__createAbortControllerInstance",
      AbortControllerClass
    )
    const abortCtorResult = ctx.vm.evalCode(`
      (function() {
        globalThis.AbortController = function AbortController() {
          return __createAbortControllerInstance()
        }
        return true
      })()
    `)
    if (abortCtorResult.error) {
      console.error(
        "[FETCH] Failed to define AbortController constructor:",
        ctx.vm.dump(abortCtorResult.error)
      )
      abortCtorResult.error.dispose()
    } else {
      abortCtorResult.value?.dispose()
    }
  })
