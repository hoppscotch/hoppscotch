import { distinctUntilChanged, map, pluck } from "rxjs/operators"
import {
  GQLHeader,
  HoppGQLRequest,
  makeGQLRequest,
  HoppGQLAuth,
} from "@hoppscotch/data"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { useStream } from "@composables/stream"
import { GQLConnection, GQLEvent } from "~/helpers/GQLConnection"
import { uniqueId } from "lodash-es"

type GQLTab = HoppGQLRequest & {
  id: string
  name: string
  connection: GQLConnection
  response: GQLEvent[]
}

export type GQLSession = {
  tabs: GQLTab[]
  currentTabId: string
}

const url = "https://echo.hoppscotch.io/graphql"

const makeTab = (id: string, connection: GQLConnection) => ({
  id,
  connection,
  response: [],
  ...makeGQLRequest({
    name: "Untitled request",
    url,
    headers: [],
    auth: {
      authType: "none",
      authActive: true,
    },
    variables: `{
  "id": "1"
}`,
    query: `query Request {
  method
  url
  headers {
    key
    value
  }
}`,
  }),
})

export const defaultGQLSession: GQLSession = {
  tabs: [makeTab("new", new GQLConnection())],
  currentTabId: "new",
}

const dispatchers = defineDispatchers({
  setSession(_: GQLSession, { session }: { session: GQLSession }) {
    return session
  },
  setName(
    { tabs, currentTabId }: GQLSession,
    { newName }: { newName: string }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              name: newName,
            }
          : tab
      ),
    }
  },
  setURL({ tabs, currentTabId }: GQLSession, { newURL }: { newURL: string }) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              url: newURL,
            }
          : tab
      ),
    }
  },
  setHeaders(
    { tabs, currentTabId }: GQLSession,
    { headers }: { headers: GQLHeader[] }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              headers,
            }
          : tab
      ),
    }
  },
  addHeader(
    { tabs, currentTabId }: GQLSession,
    { header }: { header: GQLHeader }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              headers: [...tab.headers, header],
            }
          : tab
      ),
    }
  },
  removeHeader(
    { tabs, currentTabId }: GQLSession,
    { headerIndex }: { headerIndex: number }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              headers: tab.headers.filter((_x, i) => i !== headerIndex),
            }
          : tab
      ),
    }
  },
  updateHeader(
    { tabs, currentTabId }: GQLSession,
    {
      headerIndex,
      updatedHeader,
    }: { headerIndex: number; updatedHeader: GQLHeader }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              headers: tab.headers.map((x, i) =>
                i === headerIndex ? updatedHeader : x
              ),
            }
          : tab
      ),
    }
  },
  setQuery(
    { tabs, currentTabId }: GQLSession,
    { newQuery }: { newQuery: string }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              query: newQuery,
            }
          : tab
      ),
    }
  },
  setVariables(
    { tabs, currentTabId }: GQLSession,
    { newVariables }: { newVariables: string }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              variables: newVariables,
            }
          : tab
      ),
    }
  },
  setResponse(
    { tabs, currentTabId }: GQLSession,
    { newResponse }: { newResponse: GQLEvent[] }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              response: newResponse,
            }
          : tab
      ),
    }
  },
  setAuth(
    { tabs, currentTabId }: GQLSession,
    { newAuth }: { newAuth: HoppGQLAuth }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              auth: newAuth,
            }
          : tab
      ),
    }
  },
  setTabs(_: GQLSession, { tabs }: { tabs: GQLTab[] }) {
    return {
      tabs,
    }
  },
  addTab(curr: GQLSession, { tab }: { tab: GQLTab }) {
    return {
      tabs: [...curr.tabs, tab],
    }
  },
  setCurrentTabId(_: GQLSession, { tabId }: { tabId: string }) {
    return {
      currentTabId: tabId,
    }
  },
})

export const gqlSessionStore = new DispatchingStore(
  defaultGQLSession,
  dispatchers
)

export function setGQLURL(newURL: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setURL",
    payload: {
      newURL,
    },
  })
}

export function setGQLHeaders(headers: GQLHeader[]) {
  gqlSessionStore.dispatch({
    dispatcher: "setHeaders",
    payload: {
      headers,
    },
  })
}

export function addGQLHeader(header: GQLHeader) {
  gqlSessionStore.dispatch({
    dispatcher: "addHeader",
    payload: {
      header,
    },
  })
}

export function updateGQLHeader(headerIndex: number, updatedHeader: GQLHeader) {
  gqlSessionStore.dispatch({
    dispatcher: "updateHeader",
    payload: {
      headerIndex,
      updatedHeader,
    },
  })
}

export function removeGQLHeader(headerIndex: number) {
  gqlSessionStore.dispatch({
    dispatcher: "removeHeader",
    payload: {
      headerIndex,
    },
  })
}

export function clearGQLHeaders() {
  gqlSessionStore.dispatch({
    dispatcher: "setHeaders",
    payload: {
      headers: [],
    },
  })
}

export function setGQLQuery(newQuery: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setQuery",
    payload: {
      newQuery,
    },
  })
}

export function setGQLVariables(newVariables: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setVariables",
    payload: {
      newVariables,
    },
  })
}

export function setGQLResponse(tabId: string, newResponse: GQLEvent[]) {
  gqlSessionStore.dispatch({
    dispatcher: "setResponse",
    payload: {
      newResponse,
      tabId,
    },
  })
}

export function getGQLSession() {
  return gqlSessionStore.value
}

export function getGQLResponse(tabId: string) {
  return (
    gqlSessionStore.value.tabs.find((tab) => tab.id === tabId)?.response ?? []
  )
}

export function setGQLSession(session: GQLSession) {
  gqlSessionStore.dispatch({
    dispatcher: "setSession",
    payload: {
      session,
    },
  })
}

export function useGQLRequestName() {
  return useStream(
    gqlName$,
    gqlSessionStore.value.tabs.find(
      (tab) => tab.id === gqlSessionStore.value.currentTabId
    )?.name,
    (newName) => {
      gqlSessionStore.dispatch({
        dispatcher: "setName",
        payload: { newName },
      })
    }
  )
}

export function setGQLAuth(newAuth: HoppGQLAuth) {
  gqlSessionStore.dispatch({
    dispatcher: "setAuth",
    payload: {
      newAuth,
    },
  })
}

export function setGQLTabs(tabs: GQLTab[]) {
  gqlSessionStore.dispatch({
    dispatcher: "setTabs",
    payload: {
      tabs,
    },
  })
}

export function addGQLTab(tab: GQLTab) {
  gqlSessionStore.dispatch({
    dispatcher: "addTab",
    payload: {
      tab,
    },
  })
}

export function addNewGQLTab() {
  gqlSessionStore.dispatch({
    dispatcher: "addTab",
    payload: {
      tab: { ...makeTab(uniqueId("new_"), new GQLConnection()) },
    },
  })
}

export function setCurrentTabId(tabId: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setCurrentTabId",
    payload: {
      tabId,
    },
  })
}

export const gqlName$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId)?.name
  }),
  distinctUntilChanged()
)
export const gqlURL$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId)?.url ?? url
  }),
  distinctUntilChanged()
)
export const gqlQuery$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId)?.query ?? ""
  }),
  distinctUntilChanged()
)
export const gqlVariables$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId)?.variables ?? ""
  }),
  distinctUntilChanged()
)
export const gqlHeaders$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId)?.headers ?? []
  }),
  distinctUntilChanged()
)

export const gqlAuth$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return (
      tabs.find((tab) => tab.id === currentTabId)?.auth ?? {
        authActive: true,
        authType: "none",
      }
    )
  }),
  distinctUntilChanged()
)

export const gqlResponse$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId)?.response ?? []
  }),
  distinctUntilChanged()
)

export const gqlConn$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return (
      tabs.find((tab) => tab.id === currentTabId)?.connection ??
      new GQLConnection()
    )
  }),
  distinctUntilChanged()
)

export const GQLTabs$ = gqlSessionStore.subject$.pipe(
  pluck("tabs"),
  distinctUntilChanged()
)

export const GQLCurrentTabId$ = gqlSessionStore.subject$.pipe(
  pluck("currentTabId"),
  distinctUntilChanged()
)
