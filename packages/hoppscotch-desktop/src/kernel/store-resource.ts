import * as E from "fp-ts/Either"
import type { z } from "zod"

import { Log } from "@hoppscotch/common/kernel/log"

import { Store } from "~/kernel/store"

const LOG_TAG = "store-resource"

/**
 * A single schema-validated, namespaced, persistent value in the shared
 * store.
 *
 * The persistence service holds several of these (desktop settings,
 * update state, connection state, recent instances) which previously
 * existed as bespoke `get*` / `set*` / `watch*` method pairs on the
 * service class. Each pair was ~20 lines of near-identical plumbing
 * that wrapped `Store.get` with a parse and a default fallback,
 * wrapped `Store.set` with validation and a throw on failure, and
 * wrapped `Store.watch` with an undefined filter and a parse on every
 * incoming value. Extracting the pattern to a factory cuts the
 * service down to a thin declarative layer where each resource is
 * four lines.
 *
 * A resource is an ordinary value that can be passed around and composed.
 * Compound operations (for example "add an instance to the recent list"
 * which reads, transforms, and writes) become free functions over a
 * resource rather than methods on a god class, which separates the data
 * access concern (this factory) from the business rules (the free
 * functions).
 */
export interface StoreResource<T> {
  /**
   * Reads the current value from the store. Falls back to `defaults()` on
   * any read error, missing key, or schema validation failure, so callers
   * always receive a valid `T`.
   */
  get(): Promise<T>

  /**
   * Writes a new value after validating through the schema. Throws on
   * validation failure or store write failure. Callers that want silent
   * best-effort semantics should wrap the call themselves.
   */
  set(value: T): Promise<void>

  /**
   * Subscribes to external writes. The handler receives the parsed value
   * whenever any writer (this process or another) updates the key.
   * Resolves to an unsubscribe function.
   */
  watch(handler: (value: T) => void): Promise<() => void>
}

// Input type is deliberately `any` so this works with schemas whose parse
// input differs from output, most commonly `z.object` schemas that carry
// `.default()` on each field (input has optional fields, output has them
// required). Constraining input to `T` would reject every such schema.
export function createStoreResource<T>(
  namespace: string,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<T, z.ZodTypeDef, any>,
  defaults: () => T
): StoreResource<T> {
  return {
    async get(): Promise<T> {
      const result = await Store.get<unknown>(namespace, key)
      if (E.isLeft(result) || result.right === undefined) {
        return defaults()
      }
      const parsed = schema.safeParse(result.right)
      if (!parsed.success) {
        Log.warn(
          LOG_TAG,
          `${namespace}/${key} failed schema validation, falling back to defaults`,
          parsed.error
        )
        return defaults()
      }
      return parsed.data
    },

    async set(value: T): Promise<void> {
      const validated = schema.parse(value)
      const result = await Store.set(namespace, key, validated)
      if (E.isLeft(result)) {
        // `StoreError` is a tagged union with `kind` and `message`.
        // Interpolating the object directly stringifies to
        // `[object Object]`, which is useless in logs and throws, so
        // format it explicitly here.
        const err = result.left
        throw new Error(
          `Failed to persist ${namespace}/${key}: ${err.kind}: ${err.message}`
        )
      }
    },

    async watch(handler: (value: T) => void): Promise<() => void> {
      const emitter = await Store.watch(namespace, key)
      return emitter.on("change", ({ value }: { value?: unknown }) => {
        if (value === undefined) return
        const parsed = schema.safeParse(value)
        if (parsed.success) {
          handler(parsed.data)
          return
        }
        // Mirrors the parse-failure log in `get()`. Without this, an
        // external writer with a schema mismatch (for example a shell
        // and webview temporarily out of sync after a migration) would
        // stop delivering updates with no observable signal.
        Log.warn(
          LOG_TAG,
          `${namespace}/${key} watch received invalid value, skipping`,
          parsed.error
        )
      })
    },
  }
}
