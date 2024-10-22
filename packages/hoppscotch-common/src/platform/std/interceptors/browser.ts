import * as E from "fp-ts/Either"
import {
  Interceptor,
  InterceptorError,
  NetworkResponse,
  RequestRunResult,
} from "../../../services/interceptor.service"
import axios, { AxiosRequestConfig, CancelToken } from "axios"
import { cloneDeep } from "lodash-es"
import { useSetting } from "@composables/settings"

// Helper function to check if a string is already encoded
function isEncoded(value: string): boolean {
  try {
    return value !== decodeURIComponent(value)
  } catch (e) {
    return false // in case of malformed URI sequence
  }
}

export const preProcessRequest = (
  req: AxiosRequestConfig
): AxiosRequestConfig => {
  const reqClone = cloneDeep(req)
  const encodeMode = useSetting("ENCODE_MODE")

  // If the parameters are URLSearchParams, inject them to URL instead
  // This prevents issues of marshalling the URLSearchParams to the proxy
  if (reqClone.params instanceof URLSearchParams) {
    try {
      const url = new URL(reqClone.url ?? "")

      for (const [key, value] of reqClone.params.entries()) {
        let finalValue = value
        if (
          encodeMode.value === "encode" ||
          (encodeMode.value === "auto" &&
            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value))
        ) {
          // Check if the value is already encoded (e.g., contains % symbols)
          if (!isEncoded(value)) {
            finalValue = encodeURIComponent(value)
          }
        }

        // Set the parameter with the final value
        url.searchParams.append(key, finalValue)
      }

      // decode the URL to prevent double encoding
      reqClone.url = decodeURIComponent(url.toString())
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
  cancelToken: CancelToken
): RequestRunResult["response"] {
  const timeStart = Date.now()

  try {
    const res = await axios({
      ...req,
      cancelToken,
      responseType: "arraybuffer",
    })

    const timeEnd = Date.now()

    return E.right(<NetworkResponse>{
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
      return E.right(<NetworkResponse>{
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
    }
    return E.left(<InterceptorError>{
      humanMessage: {
        heading: (t) => t("error.network_fail"),
        description: (t) => t("helpers.network_fail"),
      },
      error: e,
    })
  }
}

export const browserInterceptor: Interceptor = {
  interceptorID: "browser",
  name: (t) => t("state.none"),
  selectable: { type: "selectable" },
  runRequest(req) {
    const cancelToken = axios.CancelToken.source()

    const processedReq = preProcessRequest(req)

    const promise = runRequest(processedReq, cancelToken.token)

    return {
      cancel: () => cancelToken.cancel(),
      response: promise,
    }
  },
}
