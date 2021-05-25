import eq from "lodash/eq"
import { pluck } from "rxjs/operators"
import DispatchingStore, { Dispatchers } from "./DispatchingStore"

export const defaultRESTHistoryState = {
  state: [] as any[],
}

export const defaultGraphqlHistoryState = {
  state: [] as any[],
}

const HISTORY_LIMIT = 50

type RESTHistoryType = typeof defaultRESTHistoryState
type GraphqlHistoryType = typeof defaultGraphqlHistoryState

const HistoryDispatcher: Dispatchers<RESTHistoryType | GraphqlHistoryType> = {
  setEntries(_, { entries }: { entries: any[] }) {
    return {
      state: entries,
    }
  },
  addEntry(currentVal, { entry }) {
    return {
      state: [entry, ...currentVal.state].slice(0, HISTORY_LIMIT),
    }
  },
  deleteEntry(currentVal, { entry }) {
    return {
      state: currentVal.state.filter((e) => !eq(e, entry)),
    }
  },
  clearHistory() {
    return {
      state: [],
    }
  },
  toggleStar(currentVal, { entry }) {
    return {
      state: currentVal.state.map((e) => {
        if (eq(e, entry) && e.star !== undefined) {
          return {
            ...e,
            star: !e.star,
          }
        }
        return e
      }),
    }
  },
}

export const restHistoryStore = new DispatchingStore(
  defaultRESTHistoryState,
  HistoryDispatcher
)

export const graphqlHistoryStore = new DispatchingStore(
  defaultGraphqlHistoryState,
  HistoryDispatcher
)

export const restHistory$ = restHistoryStore.subject$.pipe(pluck("state"))
export const graphqlHistory$ = graphqlHistoryStore.subject$.pipe(pluck("state"))

export function setRESTHistoryEntries(entries: any[]) {
  restHistoryStore.dispatch({
    dispatcher: "setEntries",
    payload: { entries },
  })
}

export function addRESTHistoryEntry(entry: any) {
  restHistoryStore.dispatch({
    dispatcher: "addEntry",
    payload: { entry },
  })
}

export function deleteRESTHistoryEntry(entry: any) {
  restHistoryStore.dispatch({
    dispatcher: "deleteEntry",
    payload: { entry },
  })
}

export function clearRESTHistory() {
  restHistoryStore.dispatch({
    dispatcher: "clearHistory",
    payload: {},
  })
}

export function toggleRESTHistoryEntryStar(entry: any) {
  restHistoryStore.dispatch({
    dispatcher: "toggleStar",
    payload: { entry },
  })
}

export function setGraphqlHistoryEntries(entries: any[]) {
  graphqlHistoryStore.dispatch({
    dispatcher: "setEntries",
    payload: { entries },
  })
}

export function addGraphqlHistoryEntry(entry: any) {
  graphqlHistoryStore.dispatch({
    dispatcher: "addEntry",
    payload: { entry },
  })
}

export function deleteGraphqlHistoryEntry(entry: any) {
  graphqlHistoryStore.dispatch({
    dispatcher: "deleteEntry",
    payload: { entry },
  })
}

export function clearGraphqlHistory() {
  graphqlHistoryStore.dispatch({
    dispatcher: "clearHistory",
    payload: {},
  })
}

export function toggleGraphqlHistoryEntryStar(entry: any) {
  graphqlHistoryStore.dispatch({
    dispatcher: "toggleStar",
    payload: { entry },
  })
}
