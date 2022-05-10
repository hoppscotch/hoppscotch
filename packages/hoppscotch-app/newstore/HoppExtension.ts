import { distinctUntilChanged, pluck } from "rxjs"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

export type ExtensionStatus = "available" | "unknown-origin" | "waiting"

const initialState = {
  extensionStatus: "waiting" as ExtensionStatus,
}

const dispatchers = defineDispatchers({
  changeExtensionStatus(
    _,
    { extensionStatus }: { extensionStatus: ExtensionStatus }
  ) {
    return {
      extensionStatus,
    }
  },
})

export const hoppExtensionStore = new DispatchingStore(
  initialState,
  dispatchers
)

export const extensionStatus = hoppExtensionStore.subject$.pipe(
  pluck("extensionStatus"),
  distinctUntilChanged()
)

export function changeExtensionStatus(extensionStatus: ExtensionStatus) {
  hoppExtensionStore.dispatch({
    dispatcher: "changeExtensionStatus",
    payload: { extensionStatus },
  })
}
