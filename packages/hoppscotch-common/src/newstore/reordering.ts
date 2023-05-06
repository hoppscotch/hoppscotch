import { distinctUntilChanged, pluck } from "rxjs"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type ReorderingItem =
  | { type: "collection"; id: string; parentID: string | null }
  | { type: "request"; id: string; parentID: string | null }

type CurrentReorderingState = {
  currentReorderingItem: ReorderingItem
}

const initialState: CurrentReorderingState = {
  currentReorderingItem: {
    type: "collection",
    id: "",
    parentID: "",
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
