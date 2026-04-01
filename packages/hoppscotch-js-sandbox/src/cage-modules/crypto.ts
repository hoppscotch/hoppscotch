import {
  defineCageModule,
  defineSandboxFunctionRaw,
} from "faraday-cage/modules"
import {
  CryptoKeyRegistry,
  marshalValue,
  MAX_GET_RANDOM_VALUES_SIZE,
  uint8ArrayToVmArray,
  vmArrayToUint8Array,
} from "./utils/vm-marshal"

export type CustomCryptoModuleConfig = {
  cryptoImpl?: Crypto
}

// Normalize algorithm objects by converting certain array props to Uint8Array.
const normalizeAlgorithm = (algorithm: any): any => {
  if (typeof algorithm === "string") {
    return algorithm
  }
  if (typeof algorithm !== "object" || algorithm === null) {
    return algorithm
  }

  const normalized = { ...algorithm }

  // Convert known array properties to Uint8Array
  const arrayProps = [
    "iv",
    "counter",
    "salt",
    "additionalData",
    "label",
    "info",
    "publicExponent",
  ]
  for (const prop of arrayProps) {
    if (normalized[prop] && Array.isArray(normalized[prop])) {
      normalized[prop] = new Uint8Array(normalized[prop])
    }
  }

  return normalized
}

export const customCryptoModule = (config: CustomCryptoModuleConfig = {}) =>
  defineCageModule((ctx) => {
    const cryptoImpl = config.cryptoImpl ?? globalThis.crypto
    const subtleImpl = cryptoImpl?.subtle
    const getRandomValuesImpl = cryptoImpl?.getRandomValues

    const vmCryptoError = (message: string) =>
      ctx.scope.manage(
        ctx.vm.newError({
          name: "CryptoError",
          message,
        })
      )

    const rejectVmPromise = (message: string) =>
      ctx.scope.manage(
        ctx.vm.newPromise((_resolve, reject) => {
          reject(vmCryptoError(message))
        })
      ).handle

    const randomUUID =
      typeof cryptoImpl?.randomUUID === "function"
        ? cryptoImpl.randomUUID.bind(cryptoImpl)
        : () => {
            if (typeof getRandomValuesImpl !== "function") {
              throw new Error(
                "crypto.randomUUID is not available (requires WebCrypto)"
              )
            }

            const bytes = new Uint8Array(16)
            getRandomValuesImpl.call(cryptoImpl, bytes)
            bytes[6] = (bytes[6] & 0x0f) | 0x40
            bytes[8] = (bytes[8] & 0x3f) | 0x80
            const hex = Array.from(bytes, (b) =>
              b.toString(16).padStart(2, "0")
            ).join("")
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
          }

    // Keys cannot be serialized across the VM boundary; store host keys in a registry.
    let keyRegistry: CryptoKeyRegistry | null = null
    const getKeyRegistry = () => (keyRegistry ??= new CryptoKeyRegistry())

    // Track pending async operations so the runtime isn't disposed early.
    // Without this, WebCrypto promises can resolve/reject after the VM is torn down,
    // causing QuickJSUseAfterFree errors.
    const pendingOperations: Promise<unknown>[] = []
    let keepAliveRegistered = false
    let resolveKeepAlive: (() => void) | null = null

    const registerKeepAlive = () => {
      if (keepAliveRegistered) return
      keepAliveRegistered = true

      const keepAlivePromise = new Promise<void>((resolve) => {
        resolveKeepAlive = resolve
      })

      ctx.keepAlivePromises.push(keepAlivePromise)

      const asyncHook = async () => {
        // Poll until all operations are complete with a grace period
        let emptyRounds = 0
        const maxEmptyRounds = 5

        while (emptyRounds < maxEmptyRounds) {
          if (pendingOperations.length > 0) {
            emptyRounds = 0
            await Promise.allSettled(pendingOperations)
            await new Promise((r) => setTimeout(r, 10))
          } else {
            emptyRounds++
            await new Promise((r) => setTimeout(r, 10))
          }
        }

        // Ensure registry timers don't outlive the cage run.
        keyRegistry?.dispose()
        resolveKeepAlive?.()
      }

      // NOTE: faraday-cage's afterScriptExecutionHooks types are (() => void) but runtime supports async
      ctx.afterScriptExecutionHooks.push(asyncHook as () => void)
    }

    const trackAsyncOperation = <T>(promise: Promise<T>): Promise<T> => {
      registerKeepAlive()
      pendingOperations.push(promise)
      return promise.finally(() => {
        const index = pendingOperations.indexOf(promise)
        if (index > -1) {
          pendingOperations.splice(index, 1)
        }
      })
    }

    // ========================================================================
    // crypto.getRandomValues() implementation
    // ========================================================================
    const getRandomValuesFn = defineSandboxFunctionRaw(
      ctx,
      "getRandomValues",
      (...args) => {
        if (typeof getRandomValuesImpl !== "function") {
          throw new Error(
            "crypto.getRandomValues is not available (requires WebCrypto)"
          )
        }

        const arrayHandle = args[0]
        if (!arrayHandle) {
          throw new Error("getRandomValues requires an array-like argument")
        }

        // Get the length of the array
        const lengthHandle = ctx.vm.getProp(arrayHandle, "length")
        const length = ctx.vm.getNumber(lengthHandle)
        lengthHandle.dispose()

        // Validate size per Web Crypto spec (max 65536 bytes)
        // Prefer byteLength if available (TypedArray-like), otherwise fall back to length.
        const byteLengthHandle = ctx.vm.getProp(arrayHandle, "byteLength")
        const byteLength =
          ctx.vm.typeof(byteLengthHandle) === "number"
            ? ctx.vm.getNumber(byteLengthHandle)
            : length
        byteLengthHandle.dispose()

        if (byteLength > MAX_GET_RANDOM_VALUES_SIZE) {
          throw new Error(
            `Failed to execute 'getRandomValues': The ArrayBuffer/ArrayBufferView's byte length (${byteLength}) exceeds the maximum allowed (${MAX_GET_RANDOM_VALUES_SIZE} bytes).`
          )
        }

        if (length < 0) {
          throw new Error(
            "Failed to execute 'getRandomValues': Invalid array length"
          )
        }

        // Create a native Uint8Array and fill it with random values
        const nativeArray = new Uint8Array(length)
        getRandomValuesImpl.call(cryptoImpl, nativeArray)

        // Update the VM array with the random values
        for (let i = 0; i < length; i++) {
          const valueHandle = ctx.scope.manage(ctx.vm.newNumber(nativeArray[i]))
          ctx.vm.setProp(arrayHandle, i, valueHandle)
        }

        // Return the same array (mutated in place)
        return arrayHandle
      }
    )

    // ========================================================================
    // crypto.randomUUID() implementation
    // ========================================================================
    const randomUUIDFn = defineSandboxFunctionRaw(ctx, "randomUUID", () => {
      try {
        const uuid = randomUUID()
        return ctx.scope.manage(ctx.vm.newString(uuid))
      } catch (e) {
        throw e instanceof Error ? e : new Error(String(e))
      }
    })

    // ========================================================================
    // crypto.subtle namespace implementation
    // ========================================================================
    const subtleObj = ctx.scope.manage(ctx.vm.newObject())

    /**
     * Helper to retrieve a CryptoKey from a VM key handle
     * Keys are stored in the registry and referenced by their __keyId property
     */
    const getKeyFromHandle = (keyHandle: any): CryptoKey => {
      if (!keyRegistry) {
        throw new Error("Invalid key: key registry not initialized")
      }

      const keyIdHandle = ctx.vm.getProp(keyHandle, "__keyId")
      const keyId = ctx.vm.getString(keyIdHandle)
      keyIdHandle.dispose()

      const key = keyRegistry.get(keyId)
      if (!key) {
        throw new Error("Invalid key: key not found in registry")
      }

      // If it's a CryptoKeyPair, we need to determine which key to use
      // This shouldn't happen in normal use since we store individual keys
      if ("privateKey" in key || "publicKey" in key) {
        throw new Error("Invalid key: expected CryptoKey, got CryptoKeyPair")
      }

      return key as CryptoKey
    }

    /**
     * Helper to create a VM key handle from a CryptoKey
     */
    const createKeyHandle = (key: CryptoKey): any => {
      const keyId = getKeyRegistry().store(key)
      const keyObj = ctx.scope.manage(ctx.vm.newObject())

      // Store the key ID for later retrieval
      ctx.vm.setProp(
        keyObj,
        "__keyId",
        ctx.scope.manage(ctx.vm.newString(keyId))
      )

      // Expose basic key properties
      ctx.vm.setProp(
        keyObj,
        "type",
        ctx.scope.manage(ctx.vm.newString(key.type))
      )
      ctx.vm.setProp(
        keyObj,
        "extractable",
        key.extractable ? ctx.vm.true : ctx.vm.false
      )
      ctx.vm.setProp(keyObj, "algorithm", marshalValue(ctx, key.algorithm))

      // Marshal usages array
      const usagesArray = ctx.scope.manage(ctx.vm.newArray())
      key.usages.forEach((usage, i) => {
        ctx.vm.setProp(
          usagesArray,
          i,
          ctx.scope.manage(ctx.vm.newString(usage))
        )
      })
      ctx.vm.setProp(keyObj, "usages", usagesArray)

      return keyObj
    }

    // crypto.subtle.digest() implementation
    const digestFn = defineSandboxFunctionRaw(ctx, "digest", (...args) => {
      if (!subtleImpl) {
        return rejectVmPromise(
          "crypto.subtle.digest is not available (requires WebCrypto)"
        )
      }

      const algorithm = ctx.vm.dump(args[0]) as string | AlgorithmIdentifier
      const dataHandle = args[1]

      if (!dataHandle) {
        throw new Error("digest requires data argument")
      }

      // Convert VM data to Uint8Array
      const data = vmArrayToUint8Array(ctx, dataHandle)

      // Create a promise that resolves with the digest
      const promiseHandle = ctx.scope.manage(
        ctx.vm.newPromise((resolve, reject) => {
          trackAsyncOperation(
            subtleImpl.digest(algorithm, data as BufferSource)
          )
            .then((hashBuffer) => {
              // Convert ArrayBuffer to VM array
              const hashArray = new Uint8Array(hashBuffer)
              resolve(uint8ArrayToVmArray(ctx, hashArray))
            })
            .catch((error) => {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "CryptoError",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Digest operation failed",
                  })
                )
              )
            })
        })
      )

      return promiseHandle.handle
    })

    // crypto.subtle.encrypt() implementation
    const encryptFn = defineSandboxFunctionRaw(ctx, "encrypt", (...args) => {
      if (!subtleImpl) {
        return rejectVmPromise(
          "crypto.subtle.encrypt is not available (requires WebCrypto)"
        )
      }

      const algorithmRaw = ctx.vm.dump(args[0])
      const algorithm = normalizeAlgorithm(algorithmRaw)
      const keyHandle = args[1]
      const dataHandle = args[2]

      if (!keyHandle || !dataHandle) {
        throw new Error("encrypt requires algorithm, key, and data arguments")
      }

      // Get the key from registry
      const key = getKeyFromHandle(keyHandle)
      const data = vmArrayToUint8Array(ctx, dataHandle)

      const promiseHandle = ctx.scope.manage(
        ctx.vm.newPromise((resolve, reject) => {
          trackAsyncOperation(
            subtleImpl.encrypt(
              algorithm as AlgorithmIdentifier,
              key,
              data as BufferSource
            )
          )
            .then((encryptedBuffer) => {
              const encryptedArray = new Uint8Array(encryptedBuffer)
              resolve(uint8ArrayToVmArray(ctx, encryptedArray))
            })
            .catch((error) => {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "CryptoError",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Encryption failed",
                  })
                )
              )
            })
        })
      )

      return promiseHandle.handle
    })

    // crypto.subtle.decrypt() implementation
    const decryptFn = defineSandboxFunctionRaw(ctx, "decrypt", (...args) => {
      if (!subtleImpl) {
        return rejectVmPromise(
          "crypto.subtle.decrypt is not available (requires WebCrypto)"
        )
      }

      const algorithmRaw = ctx.vm.dump(args[0])
      const algorithm = normalizeAlgorithm(algorithmRaw)
      const keyHandle = args[1]
      const dataHandle = args[2]

      if (!keyHandle || !dataHandle) {
        throw new Error("decrypt requires algorithm, key, and data arguments")
      }

      const key = getKeyFromHandle(keyHandle)
      const data = vmArrayToUint8Array(ctx, dataHandle)

      const promiseHandle = ctx.scope.manage(
        ctx.vm.newPromise((resolve, reject) => {
          trackAsyncOperation(
            subtleImpl.decrypt(
              algorithm as AlgorithmIdentifier,
              key,
              data as BufferSource
            )
          )
            .then((decryptedBuffer) => {
              const decryptedArray = new Uint8Array(decryptedBuffer)
              resolve(uint8ArrayToVmArray(ctx, decryptedArray))
            })
            .catch((error) => {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "CryptoError",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Decryption failed",
                  })
                )
              )
            })
        })
      )

      return promiseHandle.handle
    })

    // crypto.subtle.sign() implementation
    const signFn = defineSandboxFunctionRaw(ctx, "sign", (...args) => {
      if (!subtleImpl) {
        return rejectVmPromise(
          "crypto.subtle.sign is not available (requires WebCrypto)"
        )
      }

      const algorithmRaw = ctx.vm.dump(args[0])
      const algorithm = normalizeAlgorithm(algorithmRaw)
      const keyHandle = args[1]
      const dataHandle = args[2]

      if (!keyHandle || !dataHandle) {
        throw new Error("sign requires algorithm, key, and data arguments")
      }

      const key = getKeyFromHandle(keyHandle)
      const data = vmArrayToUint8Array(ctx, dataHandle)

      const promiseHandle = ctx.scope.manage(
        ctx.vm.newPromise((resolve, reject) => {
          trackAsyncOperation(
            subtleImpl.sign(
              algorithm as AlgorithmIdentifier,
              key,
              data as BufferSource
            )
          )
            .then((signatureBuffer) => {
              const signatureArray = new Uint8Array(signatureBuffer)
              resolve(uint8ArrayToVmArray(ctx, signatureArray))
            })
            .catch((error) => {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "CryptoError",
                    message:
                      error instanceof Error ? error.message : "Sign failed",
                  })
                )
              )
            })
        })
      )

      return promiseHandle.handle
    })

    // crypto.subtle.verify() implementation
    const verifyFn = defineSandboxFunctionRaw(ctx, "verify", (...args) => {
      if (!subtleImpl) {
        return rejectVmPromise(
          "crypto.subtle.verify is not available (requires WebCrypto)"
        )
      }

      const algorithmRaw = ctx.vm.dump(args[0])
      const algorithm = normalizeAlgorithm(algorithmRaw)
      const keyHandle = args[1]
      const signatureHandle = args[2]
      const dataHandle = args[3]

      if (!keyHandle || !signatureHandle || !dataHandle) {
        throw new Error(
          "verify requires algorithm, key, signature, and data arguments"
        )
      }

      const key = getKeyFromHandle(keyHandle)
      const signature = vmArrayToUint8Array(ctx, signatureHandle)
      const data = vmArrayToUint8Array(ctx, dataHandle)

      const promiseHandle = ctx.scope.manage(
        ctx.vm.newPromise((resolve, reject) => {
          trackAsyncOperation(
            subtleImpl.verify(
              algorithm as AlgorithmIdentifier,
              key,
              signature as BufferSource,
              data as BufferSource
            )
          )
            .then((verified) => {
              resolve(verified ? ctx.vm.true : ctx.vm.false)
            })
            .catch((error) => {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "CryptoError",
                    message:
                      error instanceof Error ? error.message : "Verify failed",
                  })
                )
              )
            })
        })
      )

      return promiseHandle.handle
    })

    // crypto.subtle.generateKey() implementation
    const generateKeyFn = defineSandboxFunctionRaw(
      ctx,
      "generateKey",
      (...args) => {
        if (!subtleImpl) {
          return rejectVmPromise(
            "crypto.subtle.generateKey is not available (requires WebCrypto)"
          )
        }

        const algorithmRaw = ctx.vm.dump(args[0])
        const algorithm = normalizeAlgorithm(algorithmRaw)
        const extractable = ctx.vm.dump(args[1]) as boolean
        const keyUsages = ctx.vm.dump(args[2]) as KeyUsage[]

        if (!algorithm || extractable === undefined || !keyUsages) {
          throw new Error(
            "generateKey requires algorithm, extractable, and keyUsages arguments"
          )
        }

        const promiseHandle = ctx.scope.manage(
          ctx.vm.newPromise((resolve, reject) => {
            trackAsyncOperation(
              subtleImpl.generateKey(
                algorithm as AlgorithmIdentifier,
                extractable,
                keyUsages
              )
            )
              .then((key) => {
                // Handle both CryptoKey and CryptoKeyPair
                if ("privateKey" in key && "publicKey" in key) {
                  // It's a key pair - create handles for both
                  const keyPairObj = ctx.scope.manage(ctx.vm.newObject())
                  ctx.vm.setProp(
                    keyPairObj,
                    "privateKey",
                    createKeyHandle(key.privateKey)
                  )
                  ctx.vm.setProp(
                    keyPairObj,
                    "publicKey",
                    createKeyHandle(key.publicKey)
                  )
                  resolve(keyPairObj)
                } else {
                  // It's a single key
                  resolve(createKeyHandle(key as CryptoKey))
                }
              })
              .catch((error) => {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "CryptoError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Key generation failed",
                    })
                  )
                )
              })
          })
        )

        return promiseHandle.handle
      }
    )

    // crypto.subtle.importKey() implementation
    const importKeyFn = defineSandboxFunctionRaw(
      ctx,
      "importKey",
      (...args) => {
        if (!subtleImpl) {
          return rejectVmPromise(
            "crypto.subtle.importKey is not available (requires WebCrypto)"
          )
        }

        const format = ctx.vm.dump(args[0]) as KeyFormat
        const keyDataHandle = args[1]
        const algorithmRaw = ctx.vm.dump(args[2])
        const algorithm = normalizeAlgorithm(algorithmRaw)
        const extractable = ctx.vm.dump(args[3]) as boolean
        const keyUsages = ctx.vm.dump(args[4]) as KeyUsage[]

        if (
          !format ||
          !keyDataHandle ||
          !algorithm ||
          extractable === undefined ||
          !keyUsages
        ) {
          throw new Error(
            "importKey requires format, keyData, algorithm, extractable, and keyUsages arguments"
          )
        }

        const promiseHandle = ctx.scope.manage(
          ctx.vm.newPromise((resolve, reject) => {
            let importPromise: Promise<CryptoKey>

            // Handle format-specific overloads
            if (format === "jwk") {
              const jwkData = ctx.vm.dump(keyDataHandle) as JsonWebKey
              importPromise = trackAsyncOperation(
                subtleImpl.importKey(
                  "jwk",
                  jwkData,
                  algorithm as AlgorithmIdentifier,
                  extractable,
                  keyUsages
                )
              )
            } else {
              const bufferData = vmArrayToUint8Array(ctx, keyDataHandle)
              importPromise = trackAsyncOperation(
                subtleImpl.importKey(
                  format as "pkcs8" | "raw" | "spki",
                  bufferData as BufferSource,
                  algorithm as AlgorithmIdentifier,
                  extractable,
                  keyUsages
                )
              )
            }

            importPromise
              .then((key) => {
                resolve(createKeyHandle(key))
              })
              .catch((error) => {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "CryptoError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Key import failed",
                    })
                  )
                )
              })
          })
        )

        return promiseHandle.handle
      }
    )

    // crypto.subtle.exportKey() implementation
    const exportKeyFn = defineSandboxFunctionRaw(
      ctx,
      "exportKey",
      (...args) => {
        if (!subtleImpl) {
          return rejectVmPromise(
            "crypto.subtle.exportKey is not available (requires WebCrypto)"
          )
        }

        const format = ctx.vm.dump(args[0]) as KeyFormat
        const keyHandle = args[1]

        if (!format || !keyHandle) {
          throw new Error("exportKey requires format and key arguments")
        }

        // Get the key from registry
        const key = getKeyFromHandle(keyHandle)

        const promiseHandle = ctx.scope.manage(
          ctx.vm.newPromise((resolve, reject) => {
            trackAsyncOperation(subtleImpl.exportKey(format, key))
              .then((exportedKey) => {
                if (format === "jwk") {
                  resolve(marshalValue(ctx, exportedKey))
                } else {
                  const keyArray = new Uint8Array(exportedKey as ArrayBuffer)
                  resolve(uint8ArrayToVmArray(ctx, keyArray))
                }
              })
              .catch((error) => {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "CryptoError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Key export failed",
                    })
                  )
                )
              })
          })
        )

        return promiseHandle.handle
      }
    )

    // crypto.subtle.deriveBits() implementation
    const deriveBitsFn = defineSandboxFunctionRaw(
      ctx,
      "deriveBits",
      (...args) => {
        if (!subtleImpl) {
          return rejectVmPromise(
            "crypto.subtle.deriveBits is not available (requires WebCrypto)"
          )
        }

        const algorithmRaw = ctx.vm.dump(args[0])
        const algorithm = normalizeAlgorithm(algorithmRaw)
        const keyHandle = args[1]
        const length = ctx.vm.dump(args[2]) as number

        if (!algorithm || !keyHandle || length === undefined) {
          throw new Error(
            "deriveBits requires algorithm, key, and length arguments"
          )
        }

        const key = getKeyFromHandle(keyHandle)

        const promiseHandle = ctx.scope.manage(
          ctx.vm.newPromise((resolve, reject) => {
            trackAsyncOperation(
              subtleImpl.deriveBits(
                algorithm as AlgorithmIdentifier,
                key,
                length
              )
            )
              .then((bits) => {
                const bitsArray = new Uint8Array(bits)
                resolve(uint8ArrayToVmArray(ctx, bitsArray))
              })
              .catch((error) => {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "CryptoError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "deriveBits failed",
                    })
                  )
                )
              })
          })
        )

        return promiseHandle.handle
      }
    )

    // crypto.subtle.deriveKey() implementation
    const deriveKeyFn = defineSandboxFunctionRaw(
      ctx,
      "deriveKey",
      (...args) => {
        if (!subtleImpl) {
          return rejectVmPromise(
            "crypto.subtle.deriveKey is not available (requires WebCrypto)"
          )
        }

        const algorithmRaw = ctx.vm.dump(args[0])
        const algorithm = normalizeAlgorithm(algorithmRaw)
        const baseKeyHandle = args[1]
        const derivedKeyTypeRaw = ctx.vm.dump(args[2])
        const derivedKeyType = normalizeAlgorithm(derivedKeyTypeRaw)
        const extractable = ctx.vm.dump(args[3]) as boolean
        const keyUsages = ctx.vm.dump(args[4]) as KeyUsage[]

        if (
          !algorithm ||
          !baseKeyHandle ||
          !derivedKeyType ||
          extractable === undefined ||
          !keyUsages
        ) {
          throw new Error(
            "deriveKey requires algorithm, baseKey, derivedKeyType, extractable, and keyUsages arguments"
          )
        }

        const baseKey = getKeyFromHandle(baseKeyHandle)

        const promiseHandle = ctx.scope.manage(
          ctx.vm.newPromise((resolve, reject) => {
            trackAsyncOperation(
              subtleImpl.deriveKey(
                algorithm as AlgorithmIdentifier,
                baseKey,
                derivedKeyType as AlgorithmIdentifier,
                extractable,
                keyUsages
              )
            )
              .then((derivedKey) => {
                resolve(createKeyHandle(derivedKey))
              })
              .catch((error) => {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "CryptoError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "deriveKey failed",
                    })
                  )
                )
              })
          })
        )

        return promiseHandle.handle
      }
    )

    // crypto.subtle.wrapKey() implementation
    const wrapKeyFn = defineSandboxFunctionRaw(ctx, "wrapKey", (...args) => {
      if (!subtleImpl) {
        return rejectVmPromise(
          "crypto.subtle.wrapKey is not available (requires WebCrypto)"
        )
      }

      const format = ctx.vm.dump(args[0]) as KeyFormat
      const keyHandle = args[1]
      const wrappingKeyHandle = args[2]
      const wrapAlgorithmRaw = ctx.vm.dump(args[3])
      const wrapAlgorithm = normalizeAlgorithm(wrapAlgorithmRaw)

      if (!format || !keyHandle || !wrappingKeyHandle || !wrapAlgorithm) {
        throw new Error(
          "wrapKey requires format, key, wrappingKey, and wrapAlgorithm arguments"
        )
      }

      const key = getKeyFromHandle(keyHandle)
      const wrappingKey = getKeyFromHandle(wrappingKeyHandle)

      const promiseHandle = ctx.scope.manage(
        ctx.vm.newPromise((resolve, reject) => {
          trackAsyncOperation(
            subtleImpl.wrapKey(
              format,
              key,
              wrappingKey,
              wrapAlgorithm as AlgorithmIdentifier
            )
          )
            .then((wrappedKey) => {
              const wrappedArray = new Uint8Array(wrappedKey)
              resolve(uint8ArrayToVmArray(ctx, wrappedArray))
            })
            .catch((error) => {
              reject(
                ctx.scope.manage(
                  ctx.vm.newError({
                    name: "CryptoError",
                    message:
                      error instanceof Error ? error.message : "wrapKey failed",
                  })
                )
              )
            })
        })
      )

      return promiseHandle.handle
    })

    // crypto.subtle.unwrapKey() implementation
    const unwrapKeyFn = defineSandboxFunctionRaw(
      ctx,
      "unwrapKey",
      (...args) => {
        if (!subtleImpl) {
          return rejectVmPromise(
            "crypto.subtle.unwrapKey is not available (requires WebCrypto)"
          )
        }

        const format = ctx.vm.dump(args[0]) as KeyFormat
        const wrappedKeyHandle = args[1]
        const unwrappingKeyHandle = args[2]
        const unwrapAlgorithmRaw = ctx.vm.dump(args[3])
        const unwrapAlgorithm = normalizeAlgorithm(unwrapAlgorithmRaw)
        const unwrappedKeyAlgorithmRaw = ctx.vm.dump(args[4])
        const unwrappedKeyAlgorithm = normalizeAlgorithm(
          unwrappedKeyAlgorithmRaw
        )
        const extractable = ctx.vm.dump(args[5]) as boolean
        const keyUsages = ctx.vm.dump(args[6]) as KeyUsage[]

        if (
          !format ||
          !wrappedKeyHandle ||
          !unwrappingKeyHandle ||
          !unwrapAlgorithm ||
          !unwrappedKeyAlgorithm ||
          extractable === undefined ||
          !keyUsages
        ) {
          throw new Error(
            "unwrapKey requires all arguments: format, wrappedKey, unwrappingKey, unwrapAlgorithm, unwrappedKeyAlgorithm, extractable, keyUsages"
          )
        }

        const wrappedKey = vmArrayToUint8Array(ctx, wrappedKeyHandle)
        const unwrappingKey = getKeyFromHandle(unwrappingKeyHandle)

        const promiseHandle = ctx.scope.manage(
          ctx.vm.newPromise((resolve, reject) => {
            trackAsyncOperation(
              subtleImpl.unwrapKey(
                format,
                wrappedKey as BufferSource,
                unwrappingKey,
                unwrapAlgorithm as AlgorithmIdentifier,
                unwrappedKeyAlgorithm as AlgorithmIdentifier,
                extractable,
                keyUsages
              )
            )
              .then((unwrappedKey) => {
                resolve(createKeyHandle(unwrappedKey))
              })
              .catch((error) => {
                reject(
                  ctx.scope.manage(
                    ctx.vm.newError({
                      name: "CryptoError",
                      message:
                        error instanceof Error
                          ? error.message
                          : "unwrapKey failed",
                    })
                  )
                )
              })
          })
        )

        return promiseHandle.handle
      }
    )

    // Add all methods to subtle object
    ctx.vm.setProp(subtleObj, "digest", digestFn)
    ctx.vm.setProp(subtleObj, "encrypt", encryptFn)
    ctx.vm.setProp(subtleObj, "decrypt", decryptFn)
    ctx.vm.setProp(subtleObj, "sign", signFn)
    ctx.vm.setProp(subtleObj, "verify", verifyFn)
    ctx.vm.setProp(subtleObj, "generateKey", generateKeyFn)
    ctx.vm.setProp(subtleObj, "importKey", importKeyFn)
    ctx.vm.setProp(subtleObj, "exportKey", exportKeyFn)
    ctx.vm.setProp(subtleObj, "deriveBits", deriveBitsFn)
    ctx.vm.setProp(subtleObj, "deriveKey", deriveKeyFn)
    ctx.vm.setProp(subtleObj, "wrapKey", wrapKeyFn)
    ctx.vm.setProp(subtleObj, "unwrapKey", unwrapKeyFn)

    // ========================================================================
    // Main crypto object
    // ========================================================================
    const cryptoObj = ctx.scope.manage(ctx.vm.newObject())
    ctx.vm.setProp(cryptoObj, "getRandomValues", getRandomValuesFn)
    ctx.vm.setProp(cryptoObj, "randomUUID", randomUUIDFn)
    ctx.vm.setProp(cryptoObj, "subtle", subtleObj)

    // Set crypto on global scope
    ctx.vm.setProp(ctx.vm.global, "crypto", cryptoObj)
  })
