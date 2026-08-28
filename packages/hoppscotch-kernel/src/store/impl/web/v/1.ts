import * as E from "fp-ts/Either"
import superjson from "superjson"

import type { VersionedAPI } from "@type/versioning"
import {
  StoreV1,
  StoredData,
  StoredDataSchema,
  StoreEvents,
  StoreEventEmitter,
} from "@store/v/1"

class IndexedDBStoreManager {
  private dbName = "hoppscotch-store"
  private dbVersion = 1
  private db: IDBDatabase | null = null
  private storeName = "data"
  private static instance: IndexedDBStoreManager
  private initPromise: Promise<void> | null = null

  static getInstance(): IndexedDBStoreManager {
    if (!IndexedDBStoreManager.instance) {
      IndexedDBStoreManager.instance = new IndexedDBStoreManager()
    }
    return IndexedDBStoreManager.instance
  }

  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      request.onerror = () => {
        reject(request.error)
      }
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(String(this.storeName))) {
          db.createObjectStore(String(this.storeName))
        }
      }
    })
    return this.initPromise
  }

  async set(key: string, value: string): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite")
      const store = transaction.objectStore(this.storeName)
      const request = store.put(value, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async get(key: string): Promise<string | null> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readonly")
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)
      request.onsuccess = () => {
        const result = request.result as string | undefined
        resolve(result ?? null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async delete(key: string): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite")
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite")
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getKeysByNamespace(namespace: string): Promise<string[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readonly")
      const store = transaction.objectStore(this.storeName)
      const request = store.getAllKeys()
      request.onsuccess = () => {
        const keys = request.result as string[]
        const filteredKeys = keys.filter((key) =>
          key.startsWith(`${namespace}:`)
        )
        const mappedKeys = filteredKeys.map((key) =>
          key.replace(`${namespace}:`, "")
        )
        resolve(mappedKeys)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getAllNamespaces(): Promise<string[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readonly")
      const store = transaction.objectStore(this.storeName)
      const request = store.getAllKeys()
      request.onsuccess = () => {
        const keys = request.result as string[]
        const namespaces = keys.map((key) => key.split(":")[0])
        const uniqueNamespaces = [...new Set(namespaces)]
        resolve(uniqueNamespaces)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async has(namespace: string, key: string): Promise<boolean> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readonly")
      const store = transaction.objectStore(this.storeName)
      const request = store.get(`${namespace}:${key}`)
      request.onsuccess = () => resolve(request.result != null)
      request.onerror = () => reject(request.error)
    })
  }
}

class BrowserStoreManager {
  private static instance: BrowserStoreManager
  private listeners = new Map<
    string,
    Set<(payload: StoreEvents["change"]) => void>
  >()
  private db: IndexedDBStoreManager
  private dbInited = false

  private constructor() {
    this.db = IndexedDBStoreManager.getInstance()
  }

  private async ensureInit() {
    if (!this.dbInited) {
      await this.db.init()
      this.dbInited = true
    }
  }

  static new(): BrowserStoreManager {
    if (!BrowserStoreManager.instance) {
      BrowserStoreManager.instance = new BrowserStoreManager()
    }
    return BrowserStoreManager.instance
  }

  private getFullKey(namespace: string, key: string): string {
    return `${namespace}:${key}`
  }

  private notifyListeners(namespace: string, key: string, value?: unknown) {
    const fullKey = this.getFullKey(namespace, key)
    const listeners = this.listeners.get(fullKey) || new Set()
    listeners.forEach((listener) => listener({ namespace, key, value }))
  }

  async set(namespace: string, key: string, value: StoredData): Promise<void> {
    await this.ensureInit()
    const validated = StoredDataSchema.parse(value)
    const serialized = superjson.stringify(validated)
    const fullKey = this.getFullKey(namespace, key)
    await this.db.set(fullKey, serialized)
    this.notifyListeners(namespace, key, validated.data)
  }

  async getRaw(
    namespace: string,
    key: string
  ): Promise<StoredData | undefined> {
    await this.ensureInit()
    const rawValue = await this.db.get(this.getFullKey(namespace, key))
    if (!rawValue) return undefined
    const parsed = superjson.parse(rawValue) as StoredData
    return parsed as StoredData
  }

  async get<T>(namespace: string, key: string): Promise<T | undefined> {
    const storedData = await this.getRaw(namespace, key)
    return storedData?.data as T
  }

  async has(namespace: string, key: string): Promise<boolean> {
    await this.ensureInit()
    return await this.db.has(namespace, key)
  }

  async delete(namespace: string, key: string): Promise<boolean> {
    await this.ensureInit()
    const fullKey = this.getFullKey(namespace, key)
    await this.db.delete(fullKey)
    this.notifyListeners(namespace, key, undefined)
    return true
  }

  async clear(namespace?: string): Promise<void> {
    await this.ensureInit()
    if (namespace) {
      const keys = await this.db.getKeysByNamespace(namespace)
      for (const key of keys) {
        const fullKey = this.getFullKey(namespace, key)
        await this.db.delete(fullKey)
      }
    } else {
      await this.db.clear()
    }
    this.listeners.clear()
  }

  async listNamespaces(): Promise<string[]> {
    await this.ensureInit()
    return await this.db.getAllNamespaces()
  }

  async listKeys(namespace: string): Promise<string[]> {
    await this.ensureInit()
    return await this.db.getKeysByNamespace(namespace)
  }

  async watch(
    namespace: string,
    key: string
  ): Promise<StoreEventEmitter<StoreEvents>> {
    const fullKey = this.getFullKey(namespace, key)
    return {
      on: (event, handler) => {
        if (event !== "change") return () => {}
        if (!this.listeners.has(fullKey)) {
          this.listeners.set(fullKey, new Set())
        }
        this.listeners
          .get(fullKey)!
          .add(handler as (payload: StoreEvents["change"]) => void)
        return () =>
          this.listeners
            .get(fullKey)
            ?.delete(handler as (payload: StoreEvents["change"]) => void)
      },
      once: (event, handler) => {
        if (event !== "change") return () => {}
        const wrapper = (payload: StoreEvents["change"]) => {
          handler(payload)
          this.listeners.get(fullKey)?.delete(wrapper)
        }
        if (!this.listeners.has(fullKey)) {
          this.listeners.set(fullKey, new Set())
        }
        this.listeners.get(fullKey)!.add(wrapper)
        return () => this.listeners.get(fullKey)?.delete(wrapper)
      },
      off: (event, handler) => {
        if (event === "change") {
          this.listeners
            .get(fullKey)
            ?.delete(handler as (payload: StoreEvents["change"]) => void)
        }
      },
    }
  }
}

export const implementation: VersionedAPI<StoreV1> = {
  version: { major: 1, minor: 0, patch: 0 },
  api: {
    id: "browser-store",
    capabilities: new Set(["permanent", "structured", "watch", "namespace"]),

    // `init` and other methods in `web` don't `storePath`
    // but having a consistent API where first param of every method
    // is the path that filteres to the "realm" makes it easier to reason around
    async init(_storePath) {
      try {
        const manager = BrowserStoreManager.new()
        await (manager as any).db.init()
        return E.right(undefined)
      } catch (e) {
        return E.left({
          kind: "storage",
          message: e instanceof Error ? e.message : "Unknown error",
          cause: e,
        })
      }
    },

    async set(_storePath, namespace, key, value, options) {
      try {
        const manager = BrowserStoreManager.new()
        const existingData = await manager.getRaw(namespace, key)
        const createdAt =
          existingData?.metadata.createdAt || new Date().toISOString()
        const updatedAt = new Date().toISOString()

        const storedData: StoredData = {
          schemaVersion: 1,
          metadata: {
            createdAt,
            updatedAt,
            namespace,
            encrypted: options?.encrypt,
            compressed: options?.compress,
            ttl: options?.ttl,
          },
          data: value,
        }

        await manager.set(namespace, key, storedData)
        return E.right(undefined)
      } catch (e) {
        return E.left({
          kind: "storage",
          message: e instanceof Error ? e.message : "Unknown error",
          cause: e,
        })
      }
    },

    async get(_storePath, namespace, key) {
      try {
        const manager = BrowserStoreManager.new()
        return E.right(await manager.get(namespace, key))
      } catch (e) {
        return E.left({
          kind: "storage",
          message: e instanceof Error ? e.message : "Unknown error",
          cause: e,
        })
      }
    },

    async has(_storePath, namespace, key) {
      try {
        const manager = BrowserStoreManager.new()
        return E.right(await manager.has(namespace, key))
      } catch (e) {
        return E.left({
          kind: "storage",
          message: e instanceof Error ? e.message : "Unknown error",
          cause: e,
        })
      }
    },

    async remove(_storePath, namespace, key) {
      try {
        const manager = BrowserStoreManager.new()
        return E.right(await manager.delete(namespace, key))
      } catch (e) {
        return E.left({
          kind: "storage",
          message: e instanceof Error ? e.message : "Unknown error",
          cause: e,
        })
      }
    },

    async clear(_storePath, namespace) {
      try {
        const manager = BrowserStoreManager.new()
        await manager.clear(namespace)
        return E.right(undefined)
      } catch (e) {
        return E.left({
          kind: "storage",
          message: e instanceof Error ? e.message : "Unknown error",
          cause: e,
        })
      }
    },

    async listNamespaces(_storePath) {
      try {
        const manager = BrowserStoreManager.new()
        return E.right(await manager.listNamespaces())
      } catch (e) {
        return E.left({
          kind: "storage",
          message: e instanceof Error ? e.message : "Unknown error",
          cause: e,
        })
      }
    },

    async listKeys(_storePath, namespace) {
      try {
        const manager = BrowserStoreManager.new()
        return E.right(await manager.listKeys(namespace))
      } catch (e) {
        return E.left({
          kind: "storage",
          message: e instanceof Error ? e.message : "Unknown error",
          cause: e,
        })
      }
    },

    async watch(_storePath, namespace, key) {
      const manager = BrowserStoreManager.new()
      return manager.watch(namespace, key)
    },
  },
}
