import type {
  StorageOptions,
  StoreError,
  StoreEvents,
  StoreEventEmitter,
} from "@hoppscotch/kernel"
import * as E from "fp-ts/Either"
import { getModule } from "."
import { invoke } from "@tauri-apps/api/core"
import { join } from "@tauri-apps/api/path"

const STORE_PATH = "hoppscotch-unified.store"

export const getConfigDir = async (): Promise<string> => {
  return invoke<string>("get_config_dir")
}

export const getBackupDir = async (): Promise<string> => {
  return invoke<string>("get_backup_dir")
}

export const getLatestDir = async (): Promise<string> => {
  return invoke<string>("get_latest_dir")
}

export const getStoreDir = async (): Promise<string> => {
  return invoke<string>("get_store_dir")
}

export const getInstanceDir = async (): Promise<string> => {
  return invoke<string>("get_instance_dir")
}

const getStorePath = async (): Promise<string> => {
  try {
    const instanceDir = await getInstanceDir()
    return join(instanceDir, STORE_PATH)
  } catch (error) {
    console.error("Failed to get instance directory:", error)
    return "hoppscotch-unified.store"
  }
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
