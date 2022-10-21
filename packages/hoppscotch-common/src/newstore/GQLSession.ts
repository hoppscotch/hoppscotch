import { uniqueId } from "lodash-es"
import { distinctUntilChanged, map, pluck } from "rxjs/operators"
import { GQLConnection } from "~/helpers/graphql/GQLConnection"
import { GQLRequest } from "~/helpers/graphql/GQLRequest"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type GQLTab = {
  id: string
  request: GQLRequest
  connection: GQLConnection
  seen: boolean
}

export type GQLSession = {
  tabs: GQLTab[]
  currentTabId: string
}

const makeTab = (id: string): GQLTab => ({
  id,
  connection: new GQLConnection(),
  request: new GQLRequest(),
  seen: true,
})

export const defaultGQLSession: GQLSession = {
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
              seen: value,
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

export function setGQLSession(session: GQLSession) {
  gqlSessionStore.dispatch({
    dispatcher: "setSession",
    payload: {
      session,
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

export const gqlConn$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return (
      tabs.find((tab) => tab.id === currentTabId)?.connection ??
      new GQLConnection()
    )
  }),
  distinctUntilChanged()
)

export const gqlRequest$ = gqlSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return (
      tabs.find((tab) => tab.id === currentTabId)?.request ?? new GQLRequest()
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
