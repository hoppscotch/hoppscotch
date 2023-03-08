import { Observable } from "rxjs"
import DispatchingStore from "@hoppscotch/common/newstore/DispatchingStore"

export type DispatchersOf<T extends DispatchingStore<any, any>> =
  T extends DispatchingStore<any, infer U>
    ? U extends Record<infer D, any>
      ? D
      : never
    : never

export type StoreSyncDefinitionOf<T extends DispatchingStore<any, any>> = {
  [x in DispatchersOf<T>]?: T extends DispatchingStore<any, infer U>
    ? U extends Record<x, any>
      ? U[x] extends (x: any, y: infer Y) => any
        ? (payload: Y) => void
        : never
      : never
    : never
}

let _isRunningDispatchWithoutSyncing = true

export function runDispatchWithOutSyncing(func: () => void) {
  _isRunningDispatchWithoutSyncing = false
  func()
  _isRunningDispatchWithoutSyncing = true
}

export const getSyncInitFunction = <T extends DispatchingStore<any, any>>(
  store: T,
  storeSyncDefinition: StoreSyncDefinitionOf<T>,
  shouldSyncValue: () => boolean,
  shouldSyncObservable: Observable<boolean>
) => {
  let startSubscriptions: () => () => void | undefined
  let stopSubscriptions: () => void | undefined

  let oldSyncStatus = shouldSyncValue()

  // Start and stop the subscriptions according to the sync settings from profile
  shouldSyncObservable.subscribe((newSyncStatus) => {
    if (oldSyncStatus === true && newSyncStatus === false) {
      stopListeningToSubscriptions()
    } else if (oldSyncStatus === false && newSyncStatus === true) {
      startListeningToSubscriptions()
    }

    oldSyncStatus = newSyncStatus
  })

  function startStoreSync() {
    store.dispatches$.subscribe((actionParams) => {
      // typescript cannot understand that the dispatcher can be the index, so casting to any
      if ((storeSyncDefinition as any)[actionParams.dispatcher]) {
        const dispatcher = actionParams.dispatcher
        const payload = actionParams.payload

        const operationMapperFunction = (storeSyncDefinition as any)[dispatcher]

        if (
          operationMapperFunction &&
          _isRunningDispatchWithoutSyncing &&
          shouldSyncValue()
        ) {
          operationMapperFunction(payload)
        }
      }
    })
  }

  function setupSubscriptions(func: () => () => void) {
    startSubscriptions = func
  }

  function startListeningToSubscriptions() {
    if (!startSubscriptions) {
      console.warn(
        "We don't have a function to start subscriptions. Please use `setupSubscriptions` to setup the start function."
      )
    }

    startSubscriptions()
  }

  function stopListeningToSubscriptions() {
    if (!stopSubscriptions) {
      console.warn(
        "We don't have a function to unsubscribe. make sure you return the unsubscribe function when using setupSubscriptions"
      )
    }

    stopSubscriptions()
  }

  return {
    startStoreSync,
    setupSubscriptions,
    startListeningToSubscriptions,
    stopListeningToSubscriptions,
  }
}
