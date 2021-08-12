import { pluck, distinctUntilChanged, map, filter } from "rxjs/operators"
import { Ref } from "@nuxtjs/composition-api"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import {
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTReqBody,
  HoppRESTRequest,
  RESTReqSchemaVersion,
} from "~/helpers/types/HoppRESTRequest"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useStream } from "~/helpers/utils/composables"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"
import { HoppRESTAuth } from "~/helpers/types/HoppRESTAuth"

function getParamsInURL(url: string): { key: string; value: string }[] {
  const result: { key: string; value: string }[] = []

  try {
    const uriObj = new URL(url)

    uriObj.searchParams.forEach((value, key) => {
      result.push({ key, value })
    })
  } catch (_e) {}

  return result
}

function recalculateParams(
  oldURL: string,
  currentParams: HoppRESTParam[],
  newParams: { key: string; value: string }[]
): HoppRESTParam[] {
  const paramsInOldURL = getParamsInURL(oldURL).map((x) => x.key)

  const checkingParams = currentParams.filter(
    (x) => !paramsInOldURL.includes(x.key)
  )

  const result: HoppRESTParam[] = []

  const addedKeys: string[] = []

  newParams.forEach(({ key, value }) => {
    const currentParam = checkingParams.find(
      ({ key: currentKey }) => currentKey === key
    )

    if (!currentParam) {
      addedKeys.push(key)
      result.push({ key, value, active: true })
    } else {
      addedKeys.push(key)
      result.push({ key, value, active: currentParam.active })
    }
  })

  result.push(...checkingParams.filter((x) => !addedKeys.includes(x.key)))

  return result
}

function removeParamFromURL(url: string, param: string): string {
  try {
    const urlObj = new URL(url)
    urlObj.searchParams.delete(param)
    return urlObj.toString()
  } catch (e) {
    return url
  }
}

function removeAllParamsFromURL(url: string): string {
  try {
    const urlObj = new URL(url)
    const params: string[] = []

    urlObj.searchParams.forEach((_value, key) => params.push(key))

    params.forEach((key) => urlObj.searchParams.delete(key))

    return urlObj.toString()
  } catch (e) {
    return url
  }
}

function updateURLParam(
  url: string,
  currKey: string,
  newKey: string,
  newValue: string
): string {
  try {
    const urlObj = new URL(url)

    let params: { key: string; value: string }[] = []

    urlObj.searchParams.forEach((value, key) => params.push({ key, value }))

    params.forEach((x) => urlObj.searchParams.delete(x.key))

    params = params.map((x) => {
      if (x.key === currKey) return { key: newKey, value: newValue }
      else return x
    })

    params.forEach((x) => urlObj.searchParams.append(x.key, x.value))

    return urlObj.toString()
  } catch (e) {
    return url
  }
}

type RESTSession = {
  request: HoppRESTRequest
  response: HoppRESTResponse | null
  testResults: HoppTestResult | null
}

const defaultRESTRequest: HoppRESTRequest = {
  v: RESTReqSchemaVersion,
  endpoint: "https://httpbin.org/get",
  name: "Untitled request",
  params: [],
  headers: [],
  method: "GET",
  auth: {
    authType: "none",
    authActive: true,
  },
  preRequestScript: "// pw.env.set('variable', 'value');",
  testScript: "// pw.expect('variable').toBe('value');",
  body: {
    contentType: "application/json",
    body: "",
    isRaw: false,
  },
}

const defaultRESTSession: RESTSession = {
  request: defaultRESTRequest,
  response: null,
  testResults: null,
}

const dispatchers = defineDispatchers({
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
  setEndpoint(curr: RESTSession, { newEndpoint }: { newEndpoint: string }) {
    const paramsInNewURL = getParamsInURL(newEndpoint)
    const updatedParams = recalculateParams(
      curr.request.endpoint,
      curr.request.params,
      paramsInNewURL
    )

    return {
      request: {
        ...curr.request,
        endpoint: newEndpoint,
        params: updatedParams,
      },
    }
  },
  setParams(curr: RESTSession, { entries }: { entries: HoppRESTParam[] }) {
    return {
      request: {
        ...curr.request,
        params: entries,
      },
    }
  },
  addParam(curr: RESTSession, { newParam }: { newParam: HoppRESTParam }) {
    return {
      request: {
        ...curr.request,
        params: [...curr.request.params, newParam],
      },
    }
  },
  updateParam(
    curr: RESTSession,
    { index, updatedParam }: { index: number; updatedParam: HoppRESTParam }
  ) {
    const paramsInURL = getParamsInURL(curr.request.endpoint).map((x) => x.key)

    if (paramsInURL.includes(curr.request.params[index].key)) {
      const updatedURL = updateURLParam(
        curr.request.endpoint,
        curr.request.params[index].key,
        updatedParam.key,
        updatedParam.value
      )

      const newParams = curr.request.params.map((param, i) => {
        if (i === index) return updatedParam
        else return param
      })

      return {
        request: {
          ...curr.request,
          endpoint: updatedURL,
          params: newParams,
        },
      }
    } else {
      const newParams = curr.request.params.map((param, i) => {
        if (i === index) return updatedParam
        else return param
      })

      return {
        request: {
          ...curr.request,
          params: newParams,
        },
      }
    }
  },
  deleteParam(curr: RESTSession, { index }: { index: number }) {
    const paramsFromURL = getParamsInURL(curr.request.endpoint).map(
      (x) => x.key
    )
    if (paramsFromURL.includes(curr.request.params[index].key)) {
      const newURL = removeParamFromURL(
        curr.request.endpoint,
        curr.request.params[index].key
      )

      const newParams = getParamsInURL(newURL)

      const recalculatedParams = recalculateParams(
        curr.request.endpoint,
        curr.request.params,
        newParams
      )
      return {
        request: {
          ...curr.request,
          endpoint: newURL,
          params: recalculatedParams,
        },
      }
    } else {
      const newParams = curr.request.params.filter((_x, i) => i !== index)

      return {
        request: {
          ...curr.request,
          params: newParams,
        },
      }
    }
  },
  deleteAllParams(curr: RESTSession) {
    const newURL = removeAllParamsFromURL(curr.request.endpoint)

    return {
      request: {
        ...curr.request,
        endpoint: newURL,
        params: [],
      },
    }
  },
  updateMethod(curr: RESTSession, { newMethod }: { newMethod: string }) {
    return {
      request: {
        ...curr.request,
        method: newMethod,
      },
    }
  },
  setHeaders(curr: RESTSession, { entries }: { entries: HoppRESTHeader[] }) {
    return {
      request: {
        ...curr.request,
        headers: entries,
      },
    }
  },
  addHeader(curr: RESTSession, { entry }: { entry: HoppRESTHeader }) {
    return {
      request: {
        ...curr.request,
        headers: [...curr.request.headers, entry],
      },
    }
  },
  updateHeader(
    curr: RESTSession,
    { index, updatedEntry }: { index: number; updatedEntry: HoppRESTHeader }
  ) {
    return {
      request: {
        ...curr.request,
        headers: curr.request.headers.map((header, i) => {
          if (i === index) return updatedEntry
          else return header
        }),
      },
    }
  },
  deleteHeader(curr: RESTSession, { index }: { index: number }) {
    return {
      request: {
        ...curr.request,
        headers: curr.request.headers.filter((_, i) => i !== index),
      },
    }
  },
  deleteAllHeaders(curr: RESTSession) {
    return {
      request: {
        ...curr.request,
        headers: [],
      },
    }
  },
  setAuth(curr: RESTSession, { newAuth }: { newAuth: HoppRESTAuth }) {
    return {
      request: {
        ...curr.request,
        auth: newAuth,
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
  clearResponse(_curr: RESTSession) {
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
})

const restSessionStore = new DispatchingStore(defaultRESTSession, dispatchers)

export function getRESTRequest() {
  return restSessionStore.subject$.value.request
}

export function setRESTRequest(req: HoppRESTRequest) {
  restSessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      req,
    },
  })
}

export function resetRESTRequest() {
  setRESTRequest(defaultRESTRequest)
}

export function setRESTEndpoint(newEndpoint: string) {
  restSessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
    },
  })
}

export function setRESTRequestName(newName: string) {
  restSessionStore.dispatch({
    dispatcher: "setRequestName",
    payload: {
      newName,
    },
  })
}

export function setRESTParams(entries: HoppRESTParam[]) {
  restSessionStore.dispatch({
    dispatcher: "setParams",
    payload: {
      entries,
    },
  })
}

export function addRESTParam(newParam: HoppRESTParam) {
  restSessionStore.dispatch({
    dispatcher: "addParam",
    payload: {
      newParam,
    },
  })
}

export function updateRESTParam(index: number, updatedParam: HoppRESTParam) {
  restSessionStore.dispatch({
    dispatcher: "updateParam",
    payload: {
      updatedParam,
      index,
    },
  })
}

export function deleteRESTParam(index: number) {
  restSessionStore.dispatch({
    dispatcher: "deleteParam",
    payload: {
      index,
    },
  })
}

export function deleteAllRESTParams() {
  restSessionStore.dispatch({
    dispatcher: "deleteAllParams",
    payload: {},
  })
}

export function updateRESTMethod(newMethod: string) {
  restSessionStore.dispatch({
    dispatcher: "updateMethod",
    payload: {
      newMethod,
    },
  })
}

export function setRESTHeaders(entries: HoppRESTHeader[]) {
  restSessionStore.dispatch({
    dispatcher: "setHeaders",
    payload: {
      entries,
    },
  })
}

export function addRESTHeader(entry: HoppRESTHeader) {
  restSessionStore.dispatch({
    dispatcher: "addHeader",
    payload: {
      entry,
    },
  })
}

export function updateRESTHeader(index: number, updatedEntry: HoppRESTHeader) {
  restSessionStore.dispatch({
    dispatcher: "updateHeader",
    payload: {
      index,
      updatedEntry,
    },
  })
}

export function deleteRESTHeader(index: number) {
  restSessionStore.dispatch({
    dispatcher: "deleteHeader",
    payload: {
      index,
    },
  })
}

export function deleteAllRESTHeaders() {
  restSessionStore.dispatch({
    dispatcher: "deleteAllHeaders",
    payload: {},
  })
}

export function setRESTAuth(newAuth: HoppRESTAuth) {
  restSessionStore.dispatch({
    dispatcher: "setAuth",
    payload: {
      newAuth,
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

export function setRESTReqBody(newBody: HoppRESTReqBody | null) {
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

export const restRequest$ = restSessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const restRequestName$ = restRequest$.pipe(
  pluck("name"),
  distinctUntilChanged()
)

export const restEndpoint$ = restSessionStore.subject$.pipe(
  pluck("request", "endpoint"),
  distinctUntilChanged()
)

export const restParams$ = restSessionStore.subject$.pipe(
  pluck("request", "params"),
  distinctUntilChanged()
)

export const restActiveParamsCount$ = restParams$.pipe(
  map((params) => params.filter((x) => x.active).length)
)

export const restMethod$ = restSessionStore.subject$.pipe(
  pluck("request", "method"),
  distinctUntilChanged()
)

export const restHeaders$ = restSessionStore.subject$.pipe(
  pluck("request", "headers"),
  distinctUntilChanged()
)

export const restActiveHeadersCount$ = restHeaders$.pipe(
  map((params) => params.filter((x) => x.active).length)
)

export const restAuth$ = restRequest$.pipe(pluck("auth"))

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
      res !== null && res.type !== "loading" && res.type !== "network_fail"
  )
)

export const restTestResults$ = restSessionStore.subject$.pipe(
  pluck("testResults"),
  distinctUntilChanged()
)

/**
 * A Vue 3 composable function that gives access to a ref
 * which is updated to the preRequestScript value in the store.
 * The ref value is kept in sync with the store and all writes
 * to the ref are dispatched to the store as `setPreRequestScript`
 * dispatches.
 */
export function usePreRequestScript(): Ref<string> {
  return useStream(
    restPreRequestScript$,
    restSessionStore.value.request.preRequestScript,
    (value) => {
      setRESTPreRequestScript(value)
    }
  )
}

/**
 * A Vue 3 composable function that gives access to a ref
 * which is updated to the testScript value in the store.
 * The ref value is kept in sync with the store and all writes
 * to the ref are dispatched to the store as `setTestScript`
 * dispatches.
 */
export function useTestScript(): Ref<string> {
  return useStream(
    restTestScript$,
    restSessionStore.value.request.testScript,
    (value) => {
      setRESTTestScript(value)
    }
  )
}

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
