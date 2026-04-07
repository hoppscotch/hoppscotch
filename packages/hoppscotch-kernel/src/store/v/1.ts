import type { VersionedAPI } from "@type/versioning"
import * as E from "fp-ts/Either"
import { z } from "zod"

export type StoreCapability =
  | "permanent"
  | "temporary"
  | "structured"
  | "sync"
  | "watch"
  | "secure"
  | "namespace"

export type StoreError =
  | { kind: "not_found"; message: string }
  | { kind: "permission"; message: string }
  | { kind: "quota"; message: string }
  | { kind: "version"; message: string }
  | { kind: "parse"; message: string; cause?: unknown }
  | { kind: "storage"; message: string; cause?: unknown }
  | { kind: "encrypt"; message: string; cause?: unknown }

export interface StoreFile {
  include?: boolean

  name: string
  size: number

  lastModified: string
  content: Uint8Array
}

export interface StorageOptions {
  encrypt?: boolean
  temporary?: boolean
  compress?: boolean
  ttl?: number
}

export interface StoreEvents {
  change: {
    namespace: string
    key: string
    value?: unknown
  }
}

export const StoreMetadataSchema = z.object({
  version: z.number(),
  lastUpdated: z.string().datetime(),
  namespaces: z.record(
    z.object({
      name: z.string(),
      version: z.number(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
      keys: z.array(z.string()),
    })
  ),
})

export type StoreMetadata = z.infer<typeof StoreMetadataSchema>

export const StoredDataSchema = z.object({
  schemaVersion: z.number(),
  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    namespace: z.string(),
    encrypted: z.boolean().optional(),
    compressed: z.boolean().optional(),
    ttl: z.number().optional(),
  }),
  data: z.unknown(),
})

export type StoredData = z.infer<typeof StoredDataSchema>

export interface StoreEventEmitter<T> {
  on<K extends keyof T>(event: K, handler: (payload: T[K]) => void): () => void
  once<K extends keyof T>(
    event: K,
    handler: (payload: T[K]) => void
  ): () => void
  off<K extends keyof T>(event: K, handler: (payload: T[K]) => void): void
}

export interface StoreV1 {
  readonly id: string
  readonly capabilities: Set<StoreCapability>

  init(storePath: string): Promise<E.Either<StoreError, void>>
  set(
    storePath: string,
    namespace: string,
    key: string,
    value: unknown,
    options?: StorageOptions
  ): Promise<E.Either<StoreError, void>>
  get<T>(
    storePath: string,
    namespace: string,
    key: string
  ): Promise<E.Either<StoreError, T | undefined>>
  remove(
    storePath: string,
    namespace: string,
    key: string
  ): Promise<E.Either<StoreError, boolean>>
  clear(
    storePath: string,
    namespace?: string
  ): Promise<E.Either<StoreError, void>>
  has(
    storePath: string,
    namespace: string,
    key: string
  ): Promise<E.Either<StoreError, boolean>>
  listNamespaces(storePath: string): Promise<E.Either<StoreError, string[]>>
  listKeys(
    storePath: string,
    namespace: string
  ): Promise<E.Either<StoreError, string[]>>
  watch(
    storePath: string,
    namespace: string,
    key: string
  ): Promise<StoreEventEmitter<StoreEvents>>
}

export interface ScopedStore {
  isAvailable(): Promise<boolean>
  set(key: string, value: unknown): Promise<void>
  get<T>(key: string): Promise<T | null>
  remove(key: string): Promise<void>
}

export function extend(
  store: StoreV1,
  storePath: string,
  namespace: string
): ScopedStore {
  return {
    async isAvailable(): Promise<boolean> {
      try {
        return E.isRight(await store.init(storePath))
      } catch {
        return false
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      const result = await store.set(storePath, namespace, key, value)
      if (E.isLeft(result)) throw new Error(result.left.message)
    },

    async get<T>(key: string): Promise<T | null> {
      const result = await store.get<T>(storePath, namespace, key)
      if (E.isLeft(result)) return null
      return result.right ?? null
    },

    async remove(key: string): Promise<void> {
      const result = await store.remove(storePath, namespace, key)
      if (E.isLeft(result)) throw new Error(result.left.message)
    },
  }
}

export const v1: VersionedAPI<StoreV1> = {
  version: { major: 1, minor: 0, patch: 0 },
  api: {
    id: "default",
    capabilities: new Set(),

    init: async () => E.left({ kind: "version", message: "Not implemented" }),
    set: async () => E.left({ kind: "version", message: "Not implemented" }),
    get: async () => E.left({ kind: "version", message: "Not implemented" }),
    remove: async () => E.left({ kind: "version", message: "Not implemented" }),
    clear: async () => E.left({ kind: "version", message: "Not implemented" }),
    has: async () => E.left({ kind: "version", message: "Not implemented" }),
    listNamespaces: async () =>
      E.left({ kind: "version", message: "Not implemented" }),
    listKeys: async () =>
      E.left({ kind: "version", message: "Not implemented" }),
    watch: async () => ({
      on: () => () => {},
      once: () => () => {},
      off: () => {},
    }),
  },
}
