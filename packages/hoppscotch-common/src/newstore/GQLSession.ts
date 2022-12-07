import { HoppGQLRequest } from "@hoppscotch/data"
import { uniqueId } from "lodash-es"
import { distinctUntilChanged, map, pluck } from "rxjs/operators"
import { useStream } from "~/composables/stream"
import { GQLConnection } from "~/helpers/graphql/GQLConnection"
import { GQLRequest } from "~/helpers/graphql/GQLRequest"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type GQLTab = {
  id: string
  request: GQLRequest
  unseen: boolean
}

export type GQLSession = {
  connection: GQLConnection
  tabs: GQLTab[]
  currentTabId: string
}

const makeTab = (id: string): GQLTab => ({
  id,
  request: new GQLRequest(),
  unseen: false,
})

export const defaultGQLSession: GQLSession = {
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
  return tab.request.getRequest()
}

export function setGQLRequest(request: HoppGQLRequest) {
  const { tabs, currentTabId } = gqlSessionStore.value
  const tab = tabs.find((tab) => tab.id === currentTabId) as GQLTab
  return tab.request.setRequest(request)
}

export function useGQLRequestName() {
  const { tabs, currentTabId } = gqlSessionStore.value
  const tab = tabs.find((tab) => tab.id === currentTabId) as GQLTab
  return useStream(
    tab.request.name$,
    tab.request.name$.value,
    tab.request.setGQLName.bind(tab.request)
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

export const gqlCurrentTab$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId) as GQLTab
  }),
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
