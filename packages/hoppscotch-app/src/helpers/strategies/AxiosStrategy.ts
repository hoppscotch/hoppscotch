import axios, { AxiosRequestConfig } from "axios"
import { v4 } from "uuid"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { cloneDeep } from "lodash-es"
import { NetworkResponse, NetworkStrategy } from "../network"
import { decodeB64StringToArrayBuffer } from "../utils/b64"
import { settingsStore } from "~/newstore/settings"

let cancelSource = axios.CancelToken.source()

type ProxyHeaders = {
  "multipart-part-key"?: string
}

type ProxyPayloadType = FormData | (AxiosRequestConfig & { wantsBinary: true })

export const cancelRunningAxiosRequest = () => {
  cancelSource.cancel()

  // Create a new cancel token
  cancelSource = axios.CancelToken.source()
}

const getProxyPayload = (
  req: AxiosRequestConfig,
  multipartKey: string | null
) => {
  let payload: ProxyPayloadType = {
    ...req,
    wantsBinary: true,
  }

  if (payload.data instanceof FormData) {
    const formData = payload.data
    payload.data = ""
    formData.append(multipartKey!, JSON.stringify(payload))
    payload = formData
  }

  return payload
}

const preProcessRequest = (req: AxiosRequestConfig): AxiosRequestConfig => {
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

const axiosWithProxy: NetworkStrategy = (req) =>
  pipe(
    TE.Do,

    TE.bind("processedReq", () => TE.of(preProcessRequest(req))),

    // If the request has FormData, the proxy needs a key
    TE.bind("multipartKey", ({ processedReq }) =>
      TE.of(
        processedReq.data instanceof FormData
          ? `proxyRequestData-${v4()}`
          : null
      )
    ),

    // Build headers to send
    TE.bind("headers", ({ processedReq, multipartKey }) =>
      TE.of(
        processedReq.data instanceof FormData
          ? <ProxyHeaders>{
              "multipart-part-key": multipartKey,
            }
          : <ProxyHeaders>{}
      )
    ),

    // Create payload
    TE.bind("payload", ({ processedReq, multipartKey }) =>
      TE.of(getProxyPayload(processedReq, multipartKey))
    ),

    // Run the proxy request
    TE.chain(({ payload, headers }) =>
      TE.tryCatch(
        () =>
          axios.post(
            settingsStore.value.PROXY_URL || "https://proxy.hoppscotch.io",
            payload,
            {
              headers,
              cancelToken: cancelSource.token,
            }
          ),
        (reason) =>
          axios.isCancel(reason)
            ? "cancellation" // Convert cancellation errors into cancellation strings
            : reason
      )
    ),

    // Check success predicate
    TE.chain(
      TE.fromPredicate(
        ({ data }) => data.success,
        ({ data }) => data.data.message || "Proxy Error"
      )
    ),

    // Process Base64
    TE.chain(({ data }) => {
      if (data.isBinary) {
        data.data = decodeB64StringToArrayBuffer(data.data)
      }

      return TE.of(data)
    })
  )

const axiosWithoutProxy: NetworkStrategy = (req) =>
  pipe(
    TE.tryCatch(
      () =>
        axios({
          ...req,
          cancelToken: (cancelSource && cancelSource.token) || "",
          responseType: "arraybuffer",
        }),
      (e) => (axios.isCancel(e) ? "cancellation" : (e as any))
    ),

    TE.orElse((e) =>
      e !== "cancellation" && e.response
        ? TE.right(e.response as NetworkResponse)
        : TE.left(e)
    )
  )

const axiosStrategy: NetworkStrategy = (req) =>
  pipe(
    req,
    settingsStore.value.PROXY_ENABLED ? axiosWithProxy : axiosWithoutProxy
  )

export default axiosStrategy
