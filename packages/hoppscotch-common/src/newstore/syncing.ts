import { distinctUntilChanged, pluck } from "rxjs"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type SyncState = {
  isInitialSync: boolean
  shouldSync: boolean
}

type CurrentSyncingState = {
  currentSyncingItem: SyncState
}

const initialState: CurrentSyncingState = {
  currentSyncingItem: {
    isInitialSync: false,
    shouldSync: false,
  },
}

const dispatchers = defineDispatchers({
  changeCurrentSyncStatus(_, { syncItem }: { syncItem: SyncState }) {
    return {
      currentSyncingItem: syncItem,
    }
  },
})

export const currentSyncStore = new DispatchingStore(initialState, dispatchers)

export const currentSyncingStatus$ = currentSyncStore.subject$.pipe(
  pluck("currentSyncingItem"),
  distinctUntilChanged()
)

export function changeCurrentSyncStatus(syncItem: SyncState) {
  currentSyncStore.dispatch({
    dispatcher: "changeCurrentSyncStatus",
    payload: { syncItem },
  })
}
