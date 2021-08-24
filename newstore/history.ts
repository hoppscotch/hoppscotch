import eq from "lodash/eq"
import { pluck } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { completedRESTResponse$ } from "./RESTSession"
import {
  HoppRESTRequest,
  translateToNewRequest,
} from "~/helpers/types/HoppRESTRequest"
import {
  HoppGQLRequest,
  translateToGQLRequest,
} from "~/helpers/types/HoppGQLRequest"

export type RESTHistoryEntry = {
  v: number

  request: HoppRESTRequest

  responseMeta: {
    duration: number | null
    statusCode: number | null
  }

  star: boolean

  id?: string // For when Firebase Firestore is set
}

export type GQLHistoryEntry = {
  v: number
  request: HoppGQLRequest

  response: string

  star: boolean

  id?: string // For when Firestore ID is set
}

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
  }
}

export function translateToNewRESTHistory(x: any): RESTHistoryEntry {
  if (x.v === 1) return x

  // Legacy
  const request = translateToNewRequest(x)
  const star = x.star ?? false
  const duration = x.duration ?? null
  const statusCode = x.status ?? null

  const obj: RESTHistoryEntry = makeRESTHistoryEntry({
    request,
    star,
    responseMeta: {
      duration,
      statusCode,
    },
  })

  if (x.id) obj.id = x.id

  return obj
}

export function translateToNewGQLHistory(x: any): GQLHistoryEntry {
  if (x.v === 1) return x

  // Legacy
  const request = translateToGQLRequest(x)
  const star = x.star ?? false
  const response = x.response ?? ""

  const obj: GQLHistoryEntry = makeGQLHistoryEntry({
    request,
    star,
    response,
  })

  if (x.id) obj.id = x.id

  return obj
}

export const defaultRESTHistoryState = {
  state: [] as RESTHistoryEntry[],
}

export const defaultGraphqlHistoryState = {
  state: [] as GQLHistoryEntry[],
}

export const HISTORY_LIMIT = 50

type RESTHistoryType = typeof defaultRESTHistoryState
type GraphqlHistoryType = typeof defaultGraphqlHistoryState

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
      state: currentVal.state.filter((e) => !eq(e, entry)),
    }
  },
  clearHistory() {
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
      state: currentVal.state.filter((e) => !eq(e, entry)),
    }
  },
  clearHistory() {
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
  RESTHistoryDispatchers
)

export const graphqlHistoryStore = new DispatchingStore(
  defaultGraphqlHistoryState,
  GQLHistoryDispatchers
)

export const restHistory$ = restHistoryStore.subject$.pipe(pluck("state"))
export const graphqlHistory$ = graphqlHistoryStore.subject$.pipe(pluck("state"))

export function setRESTHistoryEntries(entries: RESTHistoryEntry[]) {
  restHistoryStore.dispatch({
    dispatcher: "setEntries",
    payload: { entries },
  })
}

export function addRESTHistoryEntry(entry: RESTHistoryEntry) {
  restHistoryStore.dispatch({
    dispatcher: "addEntry",
    payload: { entry },
  })
}

export function deleteRESTHistoryEntry(entry: RESTHistoryEntry) {
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

export function toggleRESTHistoryEntryStar(entry: RESTHistoryEntry) {
  restHistoryStore.dispatch({
    dispatcher: "toggleStar",
    payload: { entry },
  })
}

export function setGraphqlHistoryEntries(entries: GQLHistoryEntry[]) {
  graphqlHistoryStore.dispatch({
    dispatcher: "setEntries",
    payload: { entries },
  })
}

export function addGraphqlHistoryEntry(entry: GQLHistoryEntry) {
  graphqlHistoryStore.dispatch({
    dispatcher: "addEntry",
    payload: { entry },
  })
}

export function deleteGraphqlHistoryEntry(entry: GQLHistoryEntry) {
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

export function toggleGraphqlHistoryEntryStar(entry: GQLHistoryEntry) {
  graphqlHistoryStore.dispatch({
    dispatcher: "toggleStar",
    payload: { entry },
  })
}

// Listen to completed responses to add to history
completedRESTResponse$.subscribe((res) => {
  if (res !== null) {
    if (res.type === "loading" || res.type === "network_fail") return

    addRESTHistoryEntry(
      makeRESTHistoryEntry({
        request: res.req,
        responseMeta: {
          duration: res.meta.responseDuration,
          statusCode: res.statusCode,
        },
        star: false,
      })
    )
  }
})
