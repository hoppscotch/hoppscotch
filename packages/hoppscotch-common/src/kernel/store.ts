import type {
  StorageOptions,
  StoreError,
  StoreEvents,
  StoreEventEmitter,
} from "@hoppscotch/kernel"
import * as E from "fp-ts/Either"
import { getModule } from "."
import { getKernelMode } from "@hoppscotch/kernel"

const STORE_PATH = `${window.location.host}.hoppscotch.store`

// These are only defined functions if in desktop mode.
// For more context, take a look at how `hoppscotch-kernel/.../store/v1/` works
// and how the `web` mode store kernel ignores the first file directory input.
let invoke:
  | (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>)
  | undefined
let join: ((...paths: string[]) => Promise<string>) | undefined

// Single init promise to avoid multiple imports and race conditions
let initPromise: Promise<void> | undefined

const isInitd = async () => {
  if (getKernelMode() !== "desktop") return

  if (!initPromise) {
    initPromise = Promise.all([
      import("@tauri-apps/api/core").then((module) => {
        invoke = module.invoke
      }),
      import("@tauri-apps/api/path").then((module) => {
        join = module.join
      }),
    ]).then(() => {})
  }

  await initPromise
}

export const getConfigDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke) throw new Error("getConfigDir is only available in desktop mode")
  return await invoke<string>("get_config_dir")
}

export const getBackupDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke) throw new Error("getBackupDir is only available in desktop mode")
  return await invoke<string>("get_backup_dir")
}

export const getLatestDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke) throw new Error("getLatestDir is only available in desktop mode")
  return await invoke<string>("get_latest_dir")
}

export const getStoreDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke) throw new Error("getStoreDir is only available in desktop mode")
  return await invoke<string>("get_store_dir")
}

export const getInstanceDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke)
    throw new Error("getInstanceDir is only available in desktop mode")
  return await invoke<string>("get_instance_dir")
}

const getStorePath = async (): Promise<string> => {
  if (getKernelMode() === "desktop") {
    await isInitd()
    if (join) {
      try {
        const storeDir = await getStoreDir()
        return await join(storeDir, STORE_PATH)
      } catch (error) {
        console.error("Failed to get store directory:", error)
        return STORE_PATH
      }
    }
  }

  return STORE_PATH
}

export const Store = (() => {
  const module = () => getModule("store")

  return {
    capabilities: () => module().capabilities,

    init: async () => {
      const storePath = await getStorePath()
      return module().init(storePath)
    },

    set: async (
      namespace: string,
      key: string,
      value: unknown,
      options?: StorageOptions
    ): Promise<E.Either<StoreError, void>> => {
      const storePath = await getStorePath()
      return module().set(storePath, namespace, key, value, options)
    },

    get: async <T>(
      namespace: string,
      key: string
    ): Promise<E.Either<StoreError, T | undefined>> => {
      const storePath = await getStorePath()
      return module().get<T>(storePath, namespace, key)
    },

    remove: async (
      namespace: string,
      key: string
    ): Promise<E.Either<StoreError, boolean>> => {
      const storePath = await getStorePath()
      return module().remove(storePath, namespace, key)
    },

    clear: async (namespace?: string): Promise<E.Either<StoreError, void>> => {
      const storePath = await getStorePath()
      return module().clear(storePath, namespace)
    },

    has: async (
      namespace: string,
      key: string
    ): Promise<E.Either<StoreError, boolean>> => {
      const storePath = await getStorePath()
      return module().has(storePath, namespace, key)
    },

    listNamespaces: async (): Promise<E.Either<StoreError, string[]>> => {
      const storePath = await getStorePath()
      return module().listNamespaces(storePath)
    },

    listKeys: async (
      namespace: string
    ): Promise<E.Either<StoreError, string[]>> => {
      const storePath = await getStorePath()
      return module().listKeys(storePath, namespace)
    },

    watch: async (
      namespace: string,
      key: string
    ): Promise<StoreEventEmitter<StoreEvents>> => {
      const storePath = await getStorePath()
      return module().watch(storePath, namespace, key)
    },
  } as const
})()
