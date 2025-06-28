import type {
  StorageOptions,
  StoreError,
  StoreEvents,
  StoreEventEmitter,
} from "@hoppscotch/kernel"
import * as E from "fp-ts/Either"
import { getModule } from "."

const STORE_PATH = `${window.location.host}.hoppscotch.store`

export const Store = (() => {
  const module = () => getModule("store")

  return {
    capabilities: () => module().capabilities,

    init: async () => {
      return module().init(STORE_PATH)
    },

    set: async (
      namespace: string,
      key: string,
      value: unknown,
      options?: StorageOptions
    ): Promise<E.Either<StoreError, void>> => {
      return module().set(STORE_PATH, namespace, key, value, options)
    },

    get: async <T>(
      namespace: string,
      key: string
    ): Promise<E.Either<StoreError, T | undefined>> => {
      return module().get<T>(STORE_PATH, namespace, key)
    },

    remove: async (
      namespace: string,
      key: string
    ): Promise<E.Either<StoreError, boolean>> => {
      return module().remove(STORE_PATH, namespace, key)
    },

    clear: async (namespace?: string): Promise<E.Either<StoreError, void>> => {
      return module().clear(STORE_PATH, namespace)
    },

    has: async (
      namespace: string,
      key: string
    ): Promise<E.Either<StoreError, boolean>> => {
      return module().has(STORE_PATH, namespace, key)
    },

    listNamespaces: async (): Promise<E.Either<StoreError, string[]>> => {
      return module().listNamespaces(STORE_PATH)
    },

    listKeys: async (
      namespace: string
    ): Promise<E.Either<StoreError, string[]>> => {
      return module().listKeys(STORE_PATH, namespace)
    },

    watch: async (
      namespace: string,
      key: string
    ): Promise<StoreEventEmitter<StoreEvents>> => {
      return module().watch(STORE_PATH, namespace, key)
    },
  } as const
})()
