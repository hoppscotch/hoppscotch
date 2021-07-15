import eq from "lodash/eq"
import { pluck } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { completedRESTResponse$ } from "./RESTSession"

export const defaultRESTHistoryState = {
  state: [] as any[],
}

export const defaultGraphqlHistoryState = {
  state: [] as any[],
}

export const HISTORY_LIMIT = 50

type RESTHistoryType = typeof defaultRESTHistoryState
type GraphqlHistoryType = typeof defaultGraphqlHistoryState

const HistoryDispatcher = defineDispatchers({
  setEntries(
    _: RESTHistoryType | GraphqlHistoryType,
    { entries }: { entries: any[] }
  ) {
    return {
      state: entries,
    }
  },
  addEntry(currentVal: RESTHistoryType | GraphqlHistoryType, { entry }) {
    return {
      state: [entry, ...currentVal.state].slice(0, HISTORY_LIMIT),
    }
  },
  deleteEntry(currentVal: RESTHistoryType | GraphqlHistoryType, { entry }) {
    return {
      state: currentVal.state.filter((e) => !eq(e, entry)),
    }
  },
  clearHistory() {
    return {
      state: [],
    }
  },
  toggleStar(currentVal: RESTHistoryType | GraphqlHistoryType, { entry }) {
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
})

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

// Listen to completed responses to add to history
completedRESTResponse$.subscribe((res) => {
  if (res !== null) {
    if (res.type === "loading" || res.type === "network_fail") return

    addRESTHistoryEntry({
      ...res.req,
      type: res.type,
      meta: res.meta,
      statusCode: res.statusCode,
      star: false,
    })
  }
})
