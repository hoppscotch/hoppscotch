import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { HoppRESTParam, HoppRESTRequest } from "~/helpers/types/HoppRESTRequest"

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
    }
  })

  result.push(...checkingParams.filter((x) => !addedKeys.includes(x.key)))

  return result
}

type RESTSession = {
  request: HoppRESTRequest
}

const defaultRESTSession: RESTSession = {
  request: {
    endpoint: "https://httpbin.org/",
    params: [],
  },
}

const dispatchers = defineDispatchers({
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
  addParam(curr: RESTSession, { newParam }: { newParam: HoppRESTParam }) {
    return {
      request: {
        ...curr.request,
        params: [...curr.request.params, newParam],
      },
    }
  },
})

const restSessionStore = new DispatchingStore(defaultRESTSession, dispatchers)

export function setRESTEndpoint(newEndpoint: string) {
  restSessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
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

export const restRequest$ = restSessionStore.subject$.pipe(
  pluck("request"),
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
