import {
  HoppRESTReqBody,
  HoppRESTRequest,
  RESTReqSchemaVersion,
} from "@hoppscotch/data"
import { combineLatest } from "rxjs"
import { distinctUntilChanged, filter, map, pluck } from "rxjs/operators"
import { v4 } from "uuid"
import { Ref } from "vue"
import { useStream } from "~/composables/stream"
import { HoppRequestSaveContext } from "~/helpers/types/HoppRequestSaveContext"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

export type RESTTab = {
  id: string
  request: HoppRESTRequest
  response: HoppRESTResponse | null
}

export type RESTSession = {
  url: string
  tabs: RESTTab[]
  currentTabId: string
  response: HoppRESTResponse | null
  testResults: HoppTestResult | null
  saveContext: HoppRequestSaveContext | null
}

const makeTab = (id?: string): RESTTab => ({
  id: id ?? v4(),
  request: getDefaultRESTRequest(),
  response: null,
})

export const getDefaultRESTRequest = (): HoppRESTRequest => ({
  v: RESTReqSchemaVersion,
  endpoint: "https://echo.hoppscotch.io",
  name: "Untitled",
  params: [],
  headers: [],
  method: "GET",
  auth: {
    authType: "none",
    authActive: true,
  },
  preRequestScript: "",
  testScript: "",
  body: {
    contentType: null,
    body: null,
  },
})

export const defaultRESTSession: RESTSession = {
  url: "https://echo.hoppscotch.io/graphql",
  tabs: [makeTab()],
  currentTabId: "new",
  response: null,
  testResults: null,
  saveContext: null,
}

const dispatchers = defineDispatchers({
  setTabs(_: RESTSession, { tabs }: { tabs: RESTTab[] }) {
    return {
      tabs,
    }
  },
  addTab(curr: RESTSession, { tab }: { tab: RESTTab }) {
    return {
      tabs: [...curr.tabs, tab],
    }
  },
  setCurrentTabId(_: RESTSession, { tabId }: { tabId: string }) {
    return {
      currentTabId: tabId,
    }
  },
  setActiveRequestBody(
    req: RESTSession,
    { tabId, body }: { tabId: string; body: HoppRESTReqBody }
  ) {
    return {
      tabs: req.tabs.map((tab) => {
        if (tab.id === tabId) {
          return {
            ...tab,
            request: {
              ...tab.request,
              body,
            },
          }
        }
        return tab
      }),
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clearResponse(_curr: RESTSession, {}) {
    return {
      response: null,
    }
  },
  setTestResults(
    _curr: RESTSession,
    { newResults }: { newResults: HoppTestResult | null }
  ) {
    return {
      testResults: newResults,
    }
  },
  setSaveContext(
    _,
    { newContext }: { newContext: HoppRequestSaveContext | null }
  ) {
    return {
      saveContext: newContext,
    }
  },
})

const restSessionStore = new DispatchingStore(defaultRESTSession, dispatchers)

export function setRESTTabs(tabs: RESTTab[]) {
  console.log("setRESTTabs", tabs)
  restSessionStore.dispatch({
    dispatcher: "setTabs",
    payload: {
      tabs,
    },
  })
}

export function addRESTTab(tab: RESTTab) {
  restSessionStore.dispatch({
    dispatcher: "addTab",
    payload: {
      tab,
    },
  })
}

export function addNewRESTTab() {
  restSessionStore.dispatch({
    dispatcher: "addTab",
    payload: {
      tab: { ...makeTab(v4()) },
    },
  })
}

export function setCurrentTabId(tabId: string) {
  restSessionStore.dispatch({
    dispatcher: "setCurrentTabId",
    payload: {
      tabId,
    },
  })
}

export function setActiveRequestBody(body: HoppRESTReqBody) {
  restSessionStore.dispatch({
    dispatcher: "setActiveRequestBody",
    payload: {
      tabId: restSessionStore.value.currentTabId,
      body,
    },
  })
}

export const getCurrentTab = () => {
  return restSessionStore.value.tabs.find(
    (tab) => tab.id === restSessionStore.value.currentTabId
  )!
}

export const restCurrentTab$ = restSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId)!
  }),
  distinctUntilChanged()
)

export const RESTTabs$ = restSessionStore.subject$.pipe(
  pluck("tabs"),
  distinctUntilChanged()
)

export const RESTCurrentTabId$ = restSessionStore.subject$.pipe(
  pluck("currentTabId"),
  distinctUntilChanged()
)
export function getRESTRequest() {
  // current tab > request > getRequest
  return getCurrentTab().request
}
export function setRESTRequest(
  req: HoppRESTRequest,
  saveContext?: HoppRequestSaveContext | null
) {
  // TODO: set request to request class

  if (saveContext) setRESTSaveContext(saveContext)
}

export function setRESTSaveContext(saveContext: HoppRequestSaveContext | null) {
  restSessionStore.dispatch({
    dispatcher: "setSaveContext",
    payload: {
      newContext: saveContext,
    },
  })
}

export function getRESTSaveContext() {
  return restSessionStore.value.saveContext
}

// TODO: look for better way to do this
export function resetRESTRequest() {
  getCurrentTab().request
}
// TODO: look for better way to do this
export function updateRESTResponse(updatedRes: HoppRESTResponse | null) {
  getCurrentTab().request
}
export function clearRESTResponse() {
  restSessionStore.dispatch({
    dispatcher: "clearResponse",
    payload: {},
  })
}

export function setRESTTestResults(newResults: HoppTestResult | null) {
  restSessionStore.dispatch({
    dispatcher: "setTestResults",
    payload: {
      newResults,
    },
  })
}

export const restSaveContext$ = restSessionStore.subject$.pipe(
  pluck("saveContext"),
  distinctUntilChanged()
)

export const restSession$ = restSessionStore.subject$.pipe(
  distinctUntilChanged()
)

export const restRequest$ = restSessionStore.subject$.pipe(
  pluck("tabs"),
  map((tabs) => {
    const currentTab = tabs.find(
      (tab) => tab.id === restSessionStore.value.currentTabId
    )!
    return currentTab.request
  }),
  distinctUntilChanged()
)

export const restParams$ = restSessionStore.subject$.pipe(
  pluck("request", "params"),
  distinctUntilChanged()
)

export const restHeaders$ = restSessionStore.subject$.pipe(
  pluck("request", "headers"),
  distinctUntilChanged()
)

export const requestBody$ = restSessionStore.subject$.pipe(
  pluck("request", "body"),
  distinctUntilChanged()
)

export const restResponse$ = restSessionStore.subject$.pipe(
  pluck("response"),
  distinctUntilChanged()
)

export const completedRESTResponse$ = restResponse$.pipe(
  filter(
    (res) =>
      res !== null &&
      res.type !== "loading" &&
      res.type !== "network_fail" &&
      res.type !== "script_fail"
  )
)

export const restTestResults$ = restSessionStore.subject$.pipe(
  pluck("testResults"),
  distinctUntilChanged()
)

// TODO: use stream to get request body and name

export function useRESTRequestBody(): Ref<HoppRESTReqBody> {
  const body$ = combineLatest([restCurrentTab$]).pipe(
    map(([tab]) => tab.request.body)
  )

  console.log("useRESTRequestBody", body$)

  return useStream(
    body$,
    {
      contentType: null,
      body: null,
    },
    setActiveRequestBody
  )
}
