import { HoppGQLRequest, makeGQLRequest } from "@hoppscotch/data"
import { uniqueId } from "lodash-es"
import { distinctUntilChanged, map, pluck } from "rxjs/operators"
import { useStream } from "~/composables/stream"
import { GQLConnection, GQLEvent } from "~/helpers/graphql/GQLConnection"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

export const getDefaultGQLRequest = (): HoppGQLRequest =>
  makeGQLRequest({
    name: "Untitled",
    url: "https://echo.hoppscotch.io/graphql",
    headers: [],
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
}
`,
    auth: {
      authType: "none",
      authActive: true,
    },
  })

export type GQLTab = {
  id: string
  request: HoppGQLRequest
  response: GQLEvent[]
  unseen: boolean
}

export type GQLSession = {
  url: string
  connection: GQLConnection
  tabs: GQLTab[]
  currentTabId: string
}

const makeTab = (id: string): GQLTab => ({
  id,
  request: getDefaultGQLRequest(),
  response: [],
  unseen: false,
})

export const defaultGQLSession: GQLSession = {
  url: "https://echo.hoppscotch.io/graphql",
  connection: new GQLConnection(),
  tabs: [makeTab("new")],
  currentTabId: "new",
}

const dispatchers = defineDispatchers({
  setSession(_: GQLSession, { session }: { session: GQLSession }) {
    return session
  },
  setUnseen(
    { tabs }: GQLSession,
    { tabId, value }: { tabId: string; value: boolean }
  ) {
    return {
      tabs: tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              unseen: value,
            }
          : tab
      ),
    }
  },
  setURL(_: GQLSession, { url }: { url: string }) {
    return {
      url,
    }
  },
  setConnection(_: GQLSession, { connection }: { connection: GQLConnection }) {
    return {
      connection,
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
  setActiveRequestName(
    req: GQLSession,
    { tabId, name }: { tabId: string; name: string }
  ) {
    return {
      tabs: req.tabs.map((tab) => {
        if (tab.id === tabId) {
          return {
            ...tab,
            request: {
              ...tab.request,
              name,
            },
          }
        }
        return tab
      }),
    }
  },
})

export const gqlSessionStore = new DispatchingStore(
  defaultGQLSession,
  dispatchers
)

export function setResponseUnseen(tabId: string, value: boolean) {
  gqlSessionStore.dispatch({
    dispatcher: "setUnseen",
    payload: {
      tabId,
      value,
    },
  })
}

export function getGQLSession() {
  return gqlSessionStore.value
}

export function getGQLRequest() {
  const { tabs, currentTabId } = gqlSessionStore.value
  const tab = tabs.find((tab) => tab.id === currentTabId) as GQLTab
  return tab.request
}

export function setGQLRequest(request: HoppGQLRequest) {
  const { tabs, currentTabId } = gqlSessionStore.value
  gqlSessionStore.dispatch({
    dispatcher: "setTabs",
    payload: {
      tabs: tabs.map((tab) =>
        tab.id === currentTabId
          ? {
              ...tab,
              request,
            }
          : tab
      ),
    },
  })
}

export function useGQLRequestName() {
  const name$ = gqlCurrentTab$.pipe(map((tab) => tab?.request?.name))
  console.log("useRESTRequestBody", name$)
  return useStream(name$, "Untitled", setActiveRequestName)
}

export function setGQLSession(session: GQLSession) {
  gqlSessionStore.dispatch({
    dispatcher: "setSession",
    payload: {
      session,
    },
  })
}

export function setGQLUrl(url: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setURL",
    payload: {
      url,
    },
  })
}

export function setGQLConnection(connection: GQLConnection) {
  gqlSessionStore.dispatch({
    dispatcher: "setConnection",
    payload: {
      connection,
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
      tab: { ...makeTab(uniqueId("new_")) },
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

export function setActiveRequestName(name: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setActiveRequestName",
    payload: {
      tabId: gqlSessionStore.value.currentTabId,
      name,
    },
  })
}

export const gqlSession$ = gqlSessionStore.subject$.pipe(distinctUntilChanged())

export const gqlCurrentTab$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId) as GQLTab
  }),
  distinctUntilChanged()
)

export const GQLConnectionURL$ = gqlSessionStore.subject$.pipe(
  pluck("url"),
  distinctUntilChanged()
)

export const GQLConnection$ = gqlSessionStore.subject$.pipe(
  pluck("connection"),
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
