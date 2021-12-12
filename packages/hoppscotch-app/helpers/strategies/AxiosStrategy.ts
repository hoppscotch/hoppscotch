import axios, { AxiosRequestConfig } from "axios"
import { v4 } from "uuid"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
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

const axiosWithProxy: NetworkStrategy = (req) =>
  pipe(
    TE.Do,

    // If the request has FormData, the proxy needs a key
    TE.bind("multipartKey", () =>
      TE.of(req.data instanceof FormData ? v4() : null)
    ),

    // Build headers to send
    TE.bind("headers", ({ multipartKey }) =>
      TE.of(
        req.data instanceof FormData
          ? <ProxyHeaders>{
              "multipart-part-key": `proxyRequestData-${multipartKey}`,
            }
          : <ProxyHeaders>{}
      )
    ),

    // Create payload
    TE.bind("payload", ({ multipartKey }) =>
      TE.of(getProxyPayload(req, multipartKey))
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
  settingsStore.value.PROXY_ENABLED
    ? axiosWithProxy(req)
    : axiosWithoutProxy(req)

export default axiosStrategy
