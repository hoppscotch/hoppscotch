// Internal faraday-cage ctx type (kept as any).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CageModuleContext = any

export const marshalValue = (ctx: CageModuleContext, value: any): any => {
  if (value === null) return ctx.vm.null
  if (value === undefined) return ctx.vm.undefined
  if (value === true) return ctx.vm.true
  if (value === false) return ctx.vm.false
  if (typeof value === "string")
    return ctx.scope.manage(ctx.vm.newString(value))
  if (typeof value === "number")
    return ctx.scope.manage(ctx.vm.newNumber(value))
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    // Convert typed arrays to plain arrays for QuickJS
    // QuickJS doesn't support native TypedArrays/ArrayBuffer
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
    const arr = ctx.scope.manage(ctx.vm.newArray())
    for (let i = 0; i < bytes.length; i++) {
      ctx.vm.setProp(arr, i, ctx.scope.manage(ctx.vm.newNumber(bytes[i])))
    }
    // Add byteLength property for ArrayBuffer compatibility
    ctx.vm.setProp(
      arr,
      "byteLength",
      ctx.scope.manage(ctx.vm.newNumber(bytes.length))
    )
    return arr
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      const arr = ctx.scope.manage(ctx.vm.newArray())
      value.forEach((item, i) => {
        ctx.vm.setProp(arr, i, marshalValue(ctx, item))
      })
      return arr
    } else {
      const obj = ctx.scope.manage(ctx.vm.newObject())
      for (const [k, v] of Object.entries(value)) {
        ctx.vm.setProp(obj, k, marshalValue(ctx, v))
      }
      return obj
    }
  }
  return ctx.vm.undefined
}

export const vmArrayToUint8Array = (
  ctx: CageModuleContext,
  vmArray: any
): Uint8Array => {
  const length = ctx.vm.getProp(vmArray, "length")
  const lengthNum = ctx.vm.getNumber(length)
  length.dispose()

  const bytes = new Uint8Array(lengthNum)
  for (let i = 0; i < lengthNum; i++) {
    const item = ctx.vm.getProp(vmArray, i)
    bytes[i] = ctx.vm.getNumber(item)
    item.dispose()
  }
  return bytes
}

export const uint8ArrayToVmArray = (
  ctx: CageModuleContext,
  bytes: Uint8Array
): any => {
  const vmArray = ctx.scope.manage(ctx.vm.newArray())
  for (let i = 0; i < bytes.length; i++) {
    ctx.vm.setProp(vmArray, i, ctx.scope.manage(ctx.vm.newNumber(bytes[i])))
  }
  // Add byteLength property for ArrayBuffer compatibility
  ctx.vm.setProp(
    vmArray,
    "byteLength",
    ctx.scope.manage(ctx.vm.newNumber(bytes.length))
  )
  return vmArray
}

interface KeyEntry {
  ref: WeakRef<CryptoKey | CryptoKeyPair> | CryptoKey | CryptoKeyPair
  strongRef: CryptoKey | CryptoKeyPair
  expiresAt: number
}

const KEY_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

export class CryptoKeyRegistry {
  private readonly supportsWeakRef = typeof WeakRef === "function"
  private readonly supportsFinalizer =
    typeof FinalizationRegistry === "function"
  private keys = new Map<string, KeyEntry>()
  private finalizer?: FinalizationRegistry<string>
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    if (this.supportsFinalizer) {
      this.finalizer = new FinalizationRegistry((id: string) => {
        this.keys.delete(id)
      })
    }
    this.scheduleCleanup()
  }

  store(key: CryptoKey | CryptoKeyPair, ttl: number = KEY_EXPIRY_MS): string {
    const id =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : (() => {
            // Fallback if randomUUID is unavailable - identifier does not need to be cryptographically secure
            if (typeof globalThis.crypto?.getRandomValues === "function") {
              const bytes = new Uint8Array(16)
              globalThis.crypto.getRandomValues(bytes)
              // RFC 4122 v4 bits
              bytes[6] = (bytes[6] & 0x0f) | 0x40
              bytes[8] = (bytes[8] & 0x3f) | 0x80
              const hex = Array.from(bytes, (b) =>
                b.toString(16).padStart(2, "0")
              ).join("")
              return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
            }

            return `${Date.now()}-${Math.random()}-${Math.random()}`
          })()
    const expiresAt = Date.now() + ttl

    this.keys.set(id, {
      ref: this.supportsWeakRef ? new WeakRef(key) : key,
      strongRef: key,
      expiresAt,
    })

    if (this.finalizer) {
      this.finalizer.register(key, id, key)
    }
    return id
  }

  get(id: string): CryptoKey | CryptoKeyPair | undefined {
    const entry = this.keys.get(id)
    if (!entry) return undefined

    const now = Date.now()
    if (entry.expiresAt <= now) {
      this.keys.delete(id)
      return undefined
    }

    const key =
      this.supportsWeakRef && "deref" in entry.ref
        ? ((entry.ref as WeakRef<CryptoKey | CryptoKeyPair>).deref() ??
          entry.strongRef)
        : entry.strongRef

    if (!key) {
      this.keys.delete(id)
      return undefined
    }

    // Reset TTL on access
    entry.expiresAt = Date.now() + KEY_EXPIRY_MS
    return key
  }

  has(id: string): boolean {
    return this.get(id) !== undefined
  }

  delete(id: string): boolean {
    const entry = this.keys.get(id)
    if (!entry) return false

    if (this.finalizer) {
      const key = entry.strongRef

      if (key) {
        this.finalizer.unregister(key)
      }
    }

    return this.keys.delete(id)
  }

  clear(): void {
    for (const [_id, entry] of this.keys.entries()) {
      if (this.finalizer) {
        const key = entry.strongRef

        this.finalizer.unregister(key)
      }
    }
    this.keys.clear()
  }

  get size(): number {
    this.cleanup()
    return this.keys.size
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [id, entry] of this.keys.entries()) {
      const key =
        this.supportsWeakRef && "deref" in entry.ref
          ? ((entry.ref as WeakRef<CryptoKey | CryptoKeyPair>).deref() ??
            entry.strongRef)
          : entry.strongRef

      if (!key || entry.expiresAt <= now) {
        this.keys.delete(id)
      }
    }
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }

    this.cleanupTimer = setTimeout(() => {
      this.cleanup()
      this.scheduleCleanup()
    }, KEY_EXPIRY_MS) // Cleanup interval based on KEY_EXPIRY_MS
  }
}

/**
 * Maximum byte size for getRandomValues() per Web Crypto spec
 * https://www.w3.org/TR/WebCryptoAPI/#Crypto-method-getRandomValues
 */
export const MAX_GET_RANDOM_VALUES_SIZE = 65536
