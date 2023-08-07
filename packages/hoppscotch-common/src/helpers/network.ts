import { AxiosRequestConfig } from "axios"
import { BehaviorSubject, Observable } from "rxjs"
import { cloneDeep } from "lodash-es"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { HoppRESTResponse } from "./types/HoppRESTResponse"
import { EffectiveHoppRESTRequest } from "./utils/EffectiveURL"
import { getService } from "~/modules/dioc"
import {
  InterceptorService,
  NetworkResponse,
} from "~/services/interceptor.service"

export type NetworkStrategy = (
  req: AxiosRequestConfig
) => TE.TaskEither<any, NetworkResponse>

export const cancelRunningRequest = () => {
  // TODO: Implement
}

function processResponse(
  res: NetworkResponse,
  req: EffectiveHoppRESTRequest,
  backupTimeStart: number,
  backupTimeEnd: number,
  successState: HoppRESTResponse["type"]
) {
  const contentLength = res.headers["content-length"]
    ? parseInt(res.headers["content-length"])
    : (res.data as ArrayBuffer).byteLength

  return <HoppRESTResponse>{
    type: successState,
    statusCode: res.status,
    body: res.data,
    headers: Object.keys(res.headers).map((x) => ({
      key: x,
      value: res.headers[x],
    })),
    meta: {
      responseSize: contentLength,
      responseDuration: backupTimeEnd - backupTimeStart,
    },
    req,
  }
}

export function createRESTNetworkRequestStream(
  request: EffectiveHoppRESTRequest
): [Observable<HoppRESTResponse>, () => void] {
  const response = new BehaviorSubject<HoppRESTResponse>({
    type: "loading",
    req: request,
  })

  const req = cloneDeep(request)

  const headers = req.effectiveFinalHeaders.reduce((acc, { key, value }) => {
    return Object.assign(acc, { [key]: value })
  }, {})

  const params = new URLSearchParams()
  for (const param of req.effectiveFinalParams) {
    params.append(param.key, param.value)
  }

  const backupTimeStart = Date.now()

  const service = getService(InterceptorService)

  const res = service.runRequest({
    method: req.method as any,
    url: req.effectiveFinalURL.trim(),
    headers,
    params,
    data: req.effectiveFinalBody,
  })

  res.response.then((res) => {
    const backupTimeEnd = Date.now()

    if (E.isRight(res)) {
      const processedRes = processResponse(
        res.right,
        req,
        backupTimeStart,
        backupTimeEnd,
        "success"
      )

      response.next(processedRes)
      response.complete()

      return
    }

    response.next({
      type: "network_fail",
      req,
      error: res.left,
    })
    response.complete()
  })

  return [response, () => res.cancel()]
}
