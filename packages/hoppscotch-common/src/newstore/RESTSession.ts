import { useStream } from "@composables/stream"
import {
  FormDataKeyValue,
  HoppRESTReqBody,
  HoppRESTRequest,
  RESTReqSchemaVersion,
} from "@hoppscotch/data"
import { uniqueId } from "lodash-es"
import { distinctUntilChanged, filter, map, pluck } from "rxjs/operators"
import { Ref } from "vue"
import { RESTRequest } from "~/helpers/RESTRequest"
import { HoppRequestSaveContext } from "~/helpers/types/HoppRequestSaveContext"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type RESTTab = {
  id: string
  name: string
  request: RESTRequest
}

export type RESTSession = {
  url: string
  tabs: RESTTab[]
  currentTabId: string
  request: HoppRESTRequest
  response: HoppRESTResponse | null
  testResults: HoppTestResult | null
  saveContext: HoppRequestSaveContext | null
}

const makeTab = (id: string): RESTTab => ({
  id,
  name: "Untitled",
  request: new RESTRequest(),
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
  tabs: [makeTab("new")],
  currentTabId: "new",

  request: getDefaultRESTRequest(),
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
  setRequest(_: RESTSession, { req }: { req: HoppRESTRequest }) {
    return {
      request: req,
    }
  },
  setRequestName(curr: RESTSession, { newName }: { newName: string }) {
    return {
      request: {
        ...curr.request,
        name: newName,
      },
    }
  },

  setPreRequestScript(curr: RESTSession, { newScript }: { newScript: string }) {
    return {
      request: {
        ...curr.request,
        preRequestScript: newScript,
      },
    }
  },
  setTestScript(curr: RESTSession, { newScript }: { newScript: string }) {
    return {
      request: {
        ...curr.request,
        testScript: newScript,
      },
    }
  },
  addFormDataEntry(curr: RESTSession, { entry }: { entry: FormDataKeyValue }) {
    // Only perform update if the current content-type is formdata
    if (curr.request.body.contentType !== "multipart/form-data") return {}

    return {
      request: {
        ...curr.request,
        body: <HoppRESTReqBody>{
          contentType: "multipart/form-data",
          body: [...curr.request.body.body, entry],
        },
      },
    }
  },
  deleteFormDataEntry(curr: RESTSession, { index }: { index: number }) {
    // Only perform update if the current content-type is formdata
    if (curr.request.body.contentType !== "multipart/form-data") return {}

    return {
      request: {
        ...curr.request,
        body: <HoppRESTReqBody>{
          contentType: "multipart/form-data",
          body: curr.request.body.body.filter((_, i) => i !== index),
        },
      },
    }
  },
  updateFormDataEntry(
    curr: RESTSession,
    { index, entry }: { index: number; entry: FormDataKeyValue }
  ) {
    // Only perform update if the current content-type is formdata
    if (curr.request.body.contentType !== "multipart/form-data") return {}

    return {
      request: {
        ...curr.request,
        body: <HoppRESTReqBody>{
          contentType: "multipart/form-data",
          body: curr.request.body.body.map((x, i) => (i !== index ? x : entry)),
        },
      },
    }
  },
  deleteAllFormDataEntries(curr: RESTSession, {}) {
    // Only perform update if the current content-type is formdata
    if (curr.request.body.contentType !== "multipart/form-data") return {}

    return {
      request: {
        ...curr.request,
        body: <HoppRESTReqBody>{
          contentType: "multipart/form-data",
          body: [],
        },
      },
    }
  },
  setRequestBody(curr: RESTSession, { newBody }: { newBody: HoppRESTReqBody }) {
    return {
      request: {
        ...curr.request,
        body: newBody,
      },
    }
  },
  updateResponse(
    _curr: RESTSession,
    { updatedRes }: { updatedRes: HoppRESTResponse | null }
  ) {
    return {
      response: updatedRes,
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
      tab: { ...makeTab(uniqueId("new_")) },
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

export const restCurrentTab$ = restSessionStore.subject$.pipe(
  map(({ tabs, currentTabId }) => {
    return tabs.find((tab) => tab.id === currentTabId) as RESTTab
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
  return restSessionStore.subject$.value.request
}

export function setRESTRequest(
  req: HoppRESTRequest,
  saveContext?: HoppRequestSaveContext | null
) {
  restSessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      req,
    },
  })

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

export function resetRESTRequest() {
  setRESTRequest(getDefaultRESTRequest())
}

export function setRESTRequestName(newName: string) {
  restSessionStore.dispatch({
    dispatcher: "setRequestName",
    payload: {
      newName,
    },
  })
}

export function setRESTPreRequestScript(newScript: string) {
  restSessionStore.dispatch({
    dispatcher: "setPreRequestScript",
    payload: {
      newScript,
    },
  })
}

export function setRESTTestScript(newScript: string) {
  restSessionStore.dispatch({
    dispatcher: "setTestScript",
    payload: {
      newScript,
    },
  })
}

export function setRESTReqBody(newBody: HoppRESTReqBody) {
  restSessionStore.dispatch({
    dispatcher: "setRequestBody",
    payload: {
      newBody,
    },
  })
}

export function updateRESTResponse(updatedRes: HoppRESTResponse | null) {
  restSessionStore.dispatch({
    dispatcher: "updateResponse",
    payload: {
      updatedRes,
    },
  })
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

export function addFormDataEntry(entry: FormDataKeyValue) {
  restSessionStore.dispatch({
    dispatcher: "addFormDataEntry",
    payload: {
      entry,
    },
  })
}

export function deleteFormDataEntry(index: number) {
  restSessionStore.dispatch({
    dispatcher: "deleteFormDataEntry",
    payload: {
      index,
    },
  })
}

export function updateFormDataEntry(index: number, entry: FormDataKeyValue) {
  restSessionStore.dispatch({
    dispatcher: "updateFormDataEntry",
    payload: {
      index,
      entry,
    },
  })
}

export function deleteAllFormDataEntries() {
  restSessionStore.dispatch({
    dispatcher: "deleteAllFormDataEntries",
    payload: {},
  })
}

export const restSaveContext$ = restSessionStore.subject$.pipe(
  pluck("saveContext"),
  distinctUntilChanged()
)

export const restRequest$ = restSessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const restRequestName$ = restRequest$.pipe(
  pluck("name"),
  distinctUntilChanged()
)

export const restParams$ = restSessionStore.subject$.pipe(
  pluck("request", "params"),
  distinctUntilChanged()
)

export const restActiveParamsCount$ = restParams$.pipe(
  map(
    (params) =>
      params.filter((x) => x.active && (x.key !== "" || x.value !== "")).length
  )
)

export const restHeaders$ = restSessionStore.subject$.pipe(
  pluck("request", "headers"),
  distinctUntilChanged()
)

export const restActiveHeadersCount$ = restHeaders$.pipe(
  map(
    (params) =>
      params.filter((x) => x.active && (x.key !== "" || x.value !== "")).length
  )
)

export const restPreRequestScript$ = restSessionStore.subject$.pipe(
  pluck("request", "preRequestScript"),
  distinctUntilChanged()
)

export const restTestScript$ = restSessionStore.subject$.pipe(
  pluck("request", "testScript"),
  distinctUntilChanged()
)

export const restReqBody$ = restSessionStore.subject$.pipe(
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

export function useRESTRequestBody(): Ref<HoppRESTReqBody> {
  return useStream(
    restReqBody$,
    restSessionStore.value.request.body,
    setRESTReqBody
  )
}

export function useRESTRequestName(): Ref<string> {
  return useStream(
    restRequestName$,
    restSessionStore.value.request.name,
    setRESTRequestName
  )
}
