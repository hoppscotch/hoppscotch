import { isEqual } from "lodash-es"
import { map } from "rxjs/operators"
import {
  HoppRESTRequest,
  translateToNewRequest,
  HoppGQLRequest,
  translateToGQLRequest,
  GQL_REQ_SCHEMA_VERSION,
  HoppWSCommand,
  WS_REQ_SCHEMA_VERSION,
} from "@hoppscotch/data"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { executedResponses$ } from "~/helpers/RequestRunner"

export type RESTHistoryEntry = {
  v: number

  request: HoppRESTRequest

  responseMeta: {
    duration: number | null
    statusCode: number | null
  }

  star: boolean

  id?: string // For when Firebase Firestore is set

  updatedOn?: Date
}

export type GQLHistoryEntry = {
  v: number
  request: HoppGQLRequest

  response: string

  star: boolean

  id?: string // For when Firestore ID is set

  updatedOn?: Date
}

export type WSHistoryEntry = {
  v: number
  command: HoppWSCommand

  star: boolean

  id?: string // (as above)

  updatedOn?: Date
}

export type HistoryEntry = RESTHistoryEntry | GQLHistoryEntry | WSHistoryEntry

export function makeRESTHistoryEntry(
  x: Omit<RESTHistoryEntry, "v">
): RESTHistoryEntry {
  return {
    v: 1,
    ...x,
  }
}

export function makeGQLHistoryEntry(
  x: Omit<GQLHistoryEntry, "v">
): GQLHistoryEntry {
  return {
    v: 1,
    ...x,
    updatedOn: new Date(),
  }
}

export function makeWSHistoryEntry(
  x: Omit<WSHistoryEntry, "v">
): WSHistoryEntry {
  return {
    v: 1,
    ...x,
    updatedOn: new Date(),
  }
}

export function translateToNewRESTHistory(x: any): RESTHistoryEntry {
  if (x.v === 1) return x

  // Legacy
  const request = translateToNewRequest(x)
  const star = x.star ?? false
  const duration = x.duration ?? null
  const statusCode = x.status ?? null
  const updatedOn = x.updatedOn ?? null
  const obj: RESTHistoryEntry = makeRESTHistoryEntry({
    request,
    star,
    responseMeta: {
      duration,
      statusCode,
    },
    updatedOn,
  })

  if (x.id) obj.id = x.id

  return obj
}

export function translateToNewGQLHistory(x: any): GQLHistoryEntry {
  if (x.v === 1 && x.request.v === GQL_REQ_SCHEMA_VERSION) return x

  // Legacy
  const request = x.request
    ? translateToGQLRequest(x.request)
    : translateToGQLRequest(x)
  const star = x.star ?? false
  const response = x.response ?? ""
  const updatedOn = x.updatedOn ?? ""

  const obj: GQLHistoryEntry = makeGQLHistoryEntry({
    request,
    star,
    response,
    updatedOn,
  })

  if (x.id) obj.id = x.id

  return obj
}

export function translateToNewWSHistory(x: any): WSHistoryEntry {
  if (x.v === 1 && x.command.v === WS_REQ_SCHEMA_VERSION) return x

  throw Error("Invalid WebSocket history entry")
}

export const defaultRESTHistoryState = {
  state: [] as RESTHistoryEntry[],
}

export const defaultGraphqlHistoryState = {
  state: [] as GQLHistoryEntry[],
}

export const defaultWebSocketHistoryState = {
  state: [] as WSHistoryEntry[],
}

export const HISTORY_LIMIT = 50

type RESTHistoryType = typeof defaultRESTHistoryState
type GraphqlHistoryType = typeof defaultGraphqlHistoryState
type WSHistoryType = typeof defaultWebSocketHistoryState

const RESTHistoryDispatchers = defineDispatchers({
  setEntries(_: RESTHistoryType, { entries }: { entries: RESTHistoryEntry[] }) {
    return {
      state: entries,
    }
  },
  addEntry(
    currentVal: RESTHistoryType,
    { entry }: { entry: RESTHistoryEntry }
  ) {
    return {
      state: [entry, ...currentVal.state].slice(0, HISTORY_LIMIT),
    }
  },
  deleteEntry(
    currentVal: RESTHistoryType,
    { entry }: { entry: RESTHistoryEntry }
  ) {
    return {
      state: currentVal.state.filter((e) => !isEqual(e, entry)),
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clearHistory(_, {}) {
    return {
      state: [],
    }
  },
  toggleStar(
    currentVal: RESTHistoryType,
    { entry }: { entry: RESTHistoryEntry }
  ) {
    return {
      state: currentVal.state.map((e) => {
        if (isEqual(e, entry) && e.star !== undefined) {
          return {
            ...e,
            star: !e.star,
          }
        }
        return e
      }),
    }
  },
  // only used for history.sync.ts to prevent double insertion of history entries from storeSync and Subscriptions
  removeDuplicateEntry(currentVal: RESTHistoryType, { id }: { id: string }) {
    const entries = currentVal.state.filter((e) => e.id === id)

    if (entries.length == 2) {
      const indexToRemove = currentVal.state.findIndex((e) => e.id === id)

      currentVal.state.splice(indexToRemove, 1)
    }

    return {
      state: currentVal.state,
    }
  },
})

const GQLHistoryDispatchers = defineDispatchers({
  setEntries(
    _: GraphqlHistoryType,
    { entries }: { entries: GQLHistoryEntry[] }
  ) {
    return {
      state: entries,
    }
  },
  addEntry(
    currentVal: GraphqlHistoryType,
    { entry }: { entry: GQLHistoryEntry }
  ) {
    return {
      state: [entry, ...currentVal.state].slice(0, HISTORY_LIMIT),
    }
  },
  deleteEntry(
    currentVal: GraphqlHistoryType,
    { entry }: { entry: GQLHistoryEntry }
  ) {
    return {
      state: currentVal.state.filter((e) => !isEqual(e, entry)),
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clearHistory(_, {}) {
    return {
      state: [],
    }
  },
  toggleStar(
    currentVal: GraphqlHistoryType,
    { entry }: { entry: GQLHistoryEntry }
  ) {
    return {
      state: currentVal.state.map((e) => {
        if (isEqual(e, entry) && e.star !== undefined) {
          return {
            ...e,
            star: !e.star,
          }
        }
        return e
      }),
    }
  },
  // only used for history.sync.ts to prevent double insertion of history entries from storeSync and Subscriptions
  removeDuplicateEntry(currentVal: GraphqlHistoryType, { id }: { id: string }) {
    const entries = currentVal.state.filter((e) => e.id === id)

    if (entries.length == 2) {
      const indexToRemove = currentVal.state.findIndex((e) => e.id === id)

      currentVal.state.splice(indexToRemove, 1)
    }

    return {
      state: currentVal.state,
    }
  },
})

const WSHistoryDispatchers = defineDispatchers({
  setEntries(_: WSHistoryType, { entries }: { entries: WSHistoryEntry[] }) {
    return {
      state: entries,
    }
  },

  addEntry(currentVal: WSHistoryType, { entry }: { entry: WSHistoryEntry }) {
    return {
      state: [entry, ...currentVal.state].slice(0, HISTORY_LIMIT),
    }
  },

  deleteEntry(currentVal: WSHistoryType, { entry }: { entry: WSHistoryEntry }) {
    return {
      state: currentVal.state.filter((e) => !isEqual(e, entry)),
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clearHistory(_, {}) {
    return {
      state: [],
    }
  },

  toggleStar(currentVal: WSHistoryType, { entry }: { entry: WSHistoryEntry }) {
    return {
      state: currentVal.state.map((e) => {
        if (isEqual(e, entry) && e.star !== undefined) {
          return {
            ...e,
            star: !e.star,
          }
        }
        return e
      }),
    }
  },

  // (as above)
  removeDuplicateEntry(currentVal: WSHistoryType, { id }: { id: string }) {
    const entries = currentVal.state.filter((e) => e.id === id)

    if (entries.length == 2) {
      const indexToRemove = currentVal.state.findIndex((e) => e.id === id)

      currentVal.state.splice(indexToRemove, 1)
    }

    return {
      state: currentVal.state,
    }
  },
})

export const restHistoryStore = new DispatchingStore(
  defaultRESTHistoryState,
  RESTHistoryDispatchers
)

export const graphqlHistoryStore = new DispatchingStore(
  defaultGraphqlHistoryState,
  GQLHistoryDispatchers
)

export const wsHistoryStore = new DispatchingStore(
  defaultWebSocketHistoryState,
  WSHistoryDispatchers
)

const toStatePipe = map((x: { state: any }) => x.state)

export const restHistory$ = restHistoryStore.subject$.pipe(toStatePipe)
export const graphqlHistory$ = graphqlHistoryStore.subject$.pipe(toStatePipe)
export const wsHistory$ = wsHistoryStore.subject$.pipe(toStatePipe)

function _createHistoryDispatchers<T>(store: DispatchingStore<any, any>) {
  return {
    setEntries: (entries: T[]) => {
      store.dispatch({
        dispatcher: "setEntries",
        payload: { entries },
      })
    },
    addEntry: (entry: T) => {
      store.dispatch({
        dispatcher: "addEntry",
        payload: { entry },
      })
    },
    deleteEntry: (entry: T) => {
      store.dispatch({
        dispatcher: "deleteEntry",
        payload: { entry },
      })
    },
    clearHistory: () => {
      store.dispatch({
        dispatcher: "clearHistory",
        payload: {},
      })
    },
    toggleStar: (entry: T) => {
      store.dispatch({
        dispatcher: "toggleStar",
        payload: { entry },
      })
    },
    removeDuplicate: (id: string) => {
      store.dispatch({
        dispatcher: "removeDuplicateEntry",
        payload: { id },
      })
    },
  }
}

export const {
  setEntries: setRESTHistoryEntries,
  addEntry: addRESTHistoryEntry,
  deleteEntry: deleteRESTHistoryEntry,
  clearHistory: clearRESTHistory,
  toggleStar: toggleRESTHistoryEntryStar,
  removeDuplicate: removeDuplicateRestHistoryEntry,
} = _createHistoryDispatchers<RESTHistoryEntry>(restHistoryStore)

export const {
  setEntries: setGraphqlHistoryEntries,
  addEntry: addGraphqlHistoryEntry,
  deleteEntry: deleteGraphqlHistoryEntry,
  clearHistory: clearGraphqlHistory,
  toggleStar: toggleGraphqlHistoryEntryStar,
  removeDuplicate: removeDuplicateGraphqlHistoryEntry,
} = _createHistoryDispatchers<GQLHistoryEntry>(graphqlHistoryStore)

export const {
  setEntries: setWebSocketHistoryEntries,
  addEntry: addWebSocketHistoryEntry,
  deleteEntry: deleteWebSocketHistoryEntry,
  clearHistory: clearWebSocketHistory,
  toggleStar: toggleWebSocketHistoryEntryStar,
  removeDuplicate: removeDuplicateWebSocketHistoryEntry,
} = _createHistoryDispatchers<WSHistoryEntry>(wsHistoryStore)

// Listen to completed responses to add to history
executedResponses$.subscribe((res) => {
  addRESTHistoryEntry(
    makeRESTHistoryEntry({
      request: {
        auth: res.req.auth,
        body: res.req.body,
        endpoint: res.req.endpoint,
        headers: res.req.headers,
        method: res.req.method,
        name: res.req.name,
        params: res.req.params,
        preRequestScript: res.req.preRequestScript,
        testScript: res.req.testScript,
        v: res.req.v,
      },
      responseMeta: {
        duration: res.meta.responseDuration,
        statusCode: res.statusCode,
      },
      star: false,
      updatedOn: new Date(),
    })
  )
})
