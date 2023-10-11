import * as E from "fp-ts/Either"
import {
  Interceptor,
  InterceptorError,
  RequestRunResult,
} from "../../../services/interceptor.service"
import axios, { AxiosRequestConfig, CancelToken } from "axios"
import { cloneDeep } from "lodash-es"
import { Body, HttpVerb, ResponseType, getClient } from '@tauri-apps/api/http'

export const preProcessRequest = (
  req: AxiosRequestConfig
): AxiosRequestConfig => {
  const reqClone = cloneDeep(req)

  // If the parameters are URLSearchParams, inject them to URL instead
  // This prevents issues of marshalling the URLSearchParams to the proxy
  if (reqClone.params instanceof URLSearchParams) {
    try {
      const url = new URL(reqClone.url ?? "")

      for (const [key, value] of reqClone.params.entries()) {
        url.searchParams.append(key, value)
      }

      reqClone.url = url.toString()
    } catch (e) {
      // making this a non-empty block, so we can make the linter happy.
      // we should probably use, allowEmptyCatch, or take the time to do something with the caught errors :)
    }

    reqClone.params = {}
  }

  return reqClone
}

async function runRequest(
  req: AxiosRequestConfig,
  cancelled: () => boolean
): RequestRunResult["response"] {
  const timeStart = Date.now()

  const processedReq = preProcessRequest(req)
  try {
    const client = await getClient()

    if (cancelled()) {
      client.drop()
      return E.left("cancellation")
    }

    let body = Body.text(processedReq.data ?? "")

    if (processedReq.data instanceof FormData) {
      let body_data = {}
      for (const entry of processedReq.data.entries()) {
        const [name, value] = entry;
      
        if (value instanceof File) {
          let file_data = await value.arrayBuffer()

          body_data[name] = {
              file: new Uint8Array(file_data as number[]),
              fileName: value.name
          }
        }
      }

      body = Body.form(body_data);
    }

    const res = await client.request({
      method: processedReq.method as HttpVerb,
      url: processedReq.url ?? "",
      responseType: ResponseType.Binary,
      headers: processedReq.headers,
      body: body
    });

    if (cancelled()) {
      client.drop()
      return E.left("cancellation")
    }

    res.data = new Uint8Array(res.data as number[]).buffer;

    const timeEnd = Date.now()

    return E.right({
      ...res,
      config: {
        timeData: {
          startTime: timeStart,
          endTime: timeEnd,
        },
      },
    })
  } catch (e) {
    const timeEnd = Date.now()

    if (axios.isAxiosError(e) && e.response) {
      return E.right({
        ...e.response,
        config: {
          timeData: {
            startTime: timeStart,
            endTime: timeEnd,
          },
        },
      })
    } else if (axios.isCancel(e)) {
      return E.left("cancellation")
    } else {
      return E.left(<InterceptorError>{
        humanMessage: {
          heading: (t) => t("error.network_fail"),
          description: (t) => t("helpers.network_fail"),
        },
        error: e,
      })
    }
  }
}

export const localclientInterceptor: Interceptor = {
  interceptorID: "localclient",
  name: () => "localclient",
  selectable: { type: "selectable" },
  runRequest(req) {
    const processedReq = preProcessRequest(req)

    let cancelled = false

    const checkCancelled = () => { return cancelled }

    return {
      cancel: () => { cancelled = true },
      response: runRequest(processedReq, checkCancelled),
    }
  },
}
