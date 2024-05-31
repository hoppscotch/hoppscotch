import { CookieJarService } from "@hoppscotch/common/services/cookie-jar.service";
import { Interceptor, InterceptorError, RequestRunResult } from "@hoppscotch/common/services/interceptor.service";
import { Service } from "dioc";
import { cloneDeep } from "lodash-es";
import { invoke } from "@tauri-apps/api/tauri";
import * as E from "fp-ts/Either";


type KeyValuePair = {
  key: string,
  value: string
}

type FormDataValue =
  | { Text: string }
  | {
      File: {
        filename: string,
        data: Uint8Array
      }
    }

type FormDataEntry = {
  key: string,
  value: FormDataValue
}

type BodyDef =
  | { Text: string }
  | { URLEncoded: KeyValuePair[] }
  | { FormData: FormDataEntry[] }

type ClientCertDef =
  | {
      PEMCert: {
        certificate_pem: Uint8Array,
        key_pem: Uint8Array
      },

      PFXCert: {
        certificate_pfx: Uint8Array,
        password: string
      }
    }

// TODO: Figure out a way to autogen this from the interceptor definition on the Rust side
type RequestDef = {
  req_id: number

  method: string
  endpoint: string

  parameters: KeyValuePair[]
  headers: KeyValuePair[]

  body: BodyDef | null,

  validate_certs: boolean,
  root_certs_pems: Uint8Array[],
  client_cert: ClientCertDef | null
}

type RunRequestResponse = {
  status: number,
  status_text: string,
  headers: KeyValuePair[],
  data: number[],

  time_start_ms: number,
  time_end_ms: number
}

// HACK: To solve the AxiosRequestConfig being different between @hoppscotch/common
// and the axios present in this package
type AxiosRequestConfig = Parameters<Interceptor["runRequest"]>[0]

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

async function processBody(axiosReq: AxiosRequestConfig): Promise<BodyDef | null> {
  if (!axiosReq.data) return null

  if (typeof axiosReq.data === "string") {
    return { Text: axiosReq.data }
  }

  if (axiosReq.data instanceof FormData) {
    const entries: FormDataEntry[] = []

    for (const [key, value] of axiosReq.data.entries()) {
      if (typeof value === "string") {
        entries.push({
          key,
          value: { Text: value }
        })
      } else {
        entries.push({
          key,
          value: {
            File: {
              filename: value.name,
              data: new Uint8Array(await value.arrayBuffer())
            }
          }
        })
      }
    }

    return { FormData: entries }
  }

  throw new Error("Native Process Body: Unhandled Axios Request Configuration")
}

async function convertToRequestDef(axiosReq: AxiosRequestConfig, reqID: number): Promise<RequestDef> {
  return {
    req_id: reqID,
    method: axiosReq.method ?? "GET",
    endpoint: axiosReq.url ?? "",
    headers: Object.entries(axiosReq.headers ?? {})
      .map(([key, value]): KeyValuePair => ({ key, value })),
    parameters: Object.entries(axiosReq.params as Record<string, string> ?? {})
      .map(([key, value]): KeyValuePair => ({ key, value })),
    body: await processBody(axiosReq),
    root_certs_pems: [], // TODO: Implement
    validate_certs: true, // TODO: Implement
    client_cert: null, // TODO: Implement
  }
}

export class NewNativeInterceptorService extends Service implements Interceptor {
  public static readonly ID = "NEW_NATIVE_INTERCEPTOR_SERVICE"

  public interceptorID = "new-native"

  public name = () => "New Native"

  public selectable = { type: "selectable" as const }

  public supportsCookies = true

  public cookieJarService = this.bind(CookieJarService)

  private reqIDTicker = 0

  public runRequest(req: AxiosRequestConfig): RequestRunResult<InterceptorError> {
    const processedReq = preProcessRequest(req)

    const relevantCookies = this.cookieJarService.getCookiesForURL(
      new URL(processedReq.url!)
    )

    processedReq.headers["Cookie"] = relevantCookies
      .map((cookie) => `${cookie.name!}=${cookie.value!}`)
      .join(";")

    const reqID = this.reqIDTicker++;

    return {
      cancel: () => {
        invoke("plugin:hopp_native_interceptor|cancel_request", { reqId: reqID });
      },
      response: (async () => {
        const requestDef = await convertToRequestDef(processedReq, reqID)

        try {
          console.log(reqID);
          const response: RunRequestResponse = await invoke(
            "plugin:hopp_native_interceptor|run_request",
            { req: requestDef }
          )

          return E.right({
            headers: Object.fromEntries(
              response.headers.map(({ key, value }) => [key, value])
            ),
            status: response.status,
            statusText: response.status_text,
            data: new Uint8Array(response.data).buffer,
            config: {
              timeData: {
                startTime: response.time_start_ms,
                endTime: response.time_end_ms
              }
            }
          })
        } catch (e) {
          if (typeof e === "object" && (e as any)["RequestCancelled"]) {
            return E.left("cancellation" as const)
          }

          return E.left(<InterceptorError>{
            humanMessage: {
              heading: (t) => t("error.network_fail"),
              description: (t) => t("helpers.network_fail"),
            }
          })
        }
      })()
    }
  }
}
