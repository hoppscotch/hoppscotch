import { distinctUntilChanged, pluck } from "rxjs"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type ReorderingItem =
  | { type: "collection"; id: string }
  | { type: "request"; id: string }

type CurrentReorderingState = {
  currentReorderingItem: ReorderingItem
}

const initialState: CurrentReorderingState = {
  currentReorderingItem: {
    type: "collection",
    id: "",
  },
}

const dispatchers = defineDispatchers({
  changeCurrentReorderStatus(
    _,
    { reorderItem }: { reorderItem: ReorderingItem }
  ) {
    return {
      currentReorderingItem: reorderItem,
    }
  },
})

export const currentReorderStore = new DispatchingStore(
  initialState,
  dispatchers
)

export const currentReorderingStatus$ = currentReorderStore.subject$.pipe(
  pluck("currentReorderingItem"),
  distinctUntilChanged()
)

export function changeCurrentReorderStatus(reorderItem: ReorderingItem) {
  currentReorderStore.dispatch({
    dispatcher: "changeCurrentReorderStatus",
    payload: { reorderItem },
  })
}
