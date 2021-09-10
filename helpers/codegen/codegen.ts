import {
  FormDataKeyValue,
  HoppRESTHeader,
  HoppRESTParam,
} from "../types/HoppRESTRequest"
import { EffectiveHoppRESTRequest } from "../utils/EffectiveURL"
import { CLibcurlCodegen } from "./generators/c-libcurl"
import { CsRestsharpCodegen } from "./generators/cs-restsharp"
import { CurlCodegen } from "./generators/curl"
import { GoNativeCodegen } from "./generators/go-native"
import { JavaOkhttpCodegen } from "./generators/java-okhttp"
import { JavaUnirestCodegen } from "./generators/java-unirest"
import { JavascriptFetchCodegen } from "./generators/javascript-fetch"
import { JavascriptJqueryCodegen } from "./generators/javascript-jquery"
import { JavascriptXhrCodegen } from "./generators/javascript-xhr"
import { NodejsAxiosCodegen } from "./generators/nodejs-axios"
import { NodejsNativeCodegen } from "./generators/nodejs-native"
import { NodejsRequestCodegen } from "./generators/nodejs-request"
import { NodejsUnirestCodegen } from "./generators/nodejs-unirest"
import { PhpCurlCodegen } from "./generators/php-curl"
import { PowershellRestmethodCodegen } from "./generators/powershell-restmethod"
import { PythonHttpClientCodegen } from "./generators/python-http-client"
import { PythonRequestsCodegen } from "./generators/python-requests"
import { RubyNetHttpCodeGen } from "./generators/ruby-net-http"
import { SalesforceApexCodegen } from "./generators/salesforce-apex"
import { ShellHttpieCodegen } from "./generators/shell-httpie"
import { ShellWgetCodegen } from "./generators/shell-wget"

/* Register code generators here.
 * A code generator is defined as an object with the following structure.
 *
 * id: string
 * name: string
 * language: string // a string identifier used in ace editor for syntax highlighting
 *                  // see node_modules/ace-builds/src-noconflict/mode-** files for valid value
 * generator: (ctx) => string
 *
 */
export const codegens = [
  CLibcurlCodegen,
  CsRestsharpCodegen,
  CurlCodegen,
  GoNativeCodegen,
  JavaOkhttpCodegen,
  JavaUnirestCodegen,
  JavascriptFetchCodegen,
  JavascriptJqueryCodegen,
  JavascriptXhrCodegen,
  NodejsAxiosCodegen,
  NodejsNativeCodegen,
  NodejsRequestCodegen,
  NodejsUnirestCodegen,
  PhpCurlCodegen,
  PowershellRestmethodCodegen,
  PythonHttpClientCodegen,
  PythonRequestsCodegen,
  RubyNetHttpCodeGen,
  SalesforceApexCodegen,
  ShellHttpieCodegen,
  ShellWgetCodegen,
]

export type HoppCodegenContext = {
  name: string
  method: string
  uri: string
  url: string
  pathName: string
  auth: any // TODO: Change this
  httpUser: string | null
  httpPassword: string | null
  bearerToken: string | null
  headers: HoppRESTHeader[]
  params: HoppRESTParam[]
  bodyParams: FormDataKeyValue[]
  rawParams: string | null
  rawInput: boolean
  rawRequestBody: string | null
  contentType: string | null
  queryString: string
}

export function generateCodeWithGenerator(
  codegenID: string,
  context: HoppCodegenContext
) {
  if (codegenID) {
    const gen = codegens.find(({ id }) => id === codegenID)
    return gen ? gen.generator(context) : ""
  }

  return ""
}

function getCodegenAuth(
  request: EffectiveHoppRESTRequest
): Pick<
  HoppCodegenContext,
  "auth" | "bearerToken" | "httpUser" | "httpPassword"
> {
  if (!request.auth.authActive || request.auth.authType === "none") {
    return {
      auth: "None",
      httpUser: null,
      httpPassword: null,
      bearerToken: null,
    }
  }

  if (request.auth.authType === "basic") {
    return {
      auth: "Basic Auth",
      httpUser: request.auth.username,
      httpPassword: request.auth.password,
      bearerToken: null,
    }
  } else {
    return {
      auth: "Bearer Token",
      httpUser: null,
      httpPassword: null,
      bearerToken: request.auth.token,
    }
  }
}

function getCodegenGeneralRESTInfo(
  request: EffectiveHoppRESTRequest
): Pick<
  HoppCodegenContext,
  | "name"
  | "uri"
  | "url"
  | "method"
  | "queryString"
  | "pathName"
  | "params"
  | "headers"
> {
  const urlObj = new URL(request.effectiveFinalURL)
  request.effectiveFinalParams.forEach(({ key, value }) => {
    urlObj.searchParams.append(key, value)
  })

  // Remove authorization headers if auth is specified (because see #1798)
  const finalHeaders =
    request.auth.authActive && request.auth.authType !== "none"
      ? request.effectiveFinalHeaders
          .filter((x) => x.key.toLowerCase() !== "authorization")
          .map((x) => ({ ...x, active: true }))
      : request.effectiveFinalHeaders.map((x) => ({ ...x, active: true }))

  return {
    name: request.name,
    uri: request.effectiveFinalURL,
    headers: finalHeaders,
    params: request.effectiveFinalParams.map((x) => ({ ...x, active: true })),
    method: request.method,
    url: urlObj.origin,
    queryString: urlObj.searchParams.toString(),
    pathName: urlObj.pathname,
  }
}

function getCodegenReqBodyData(
  request: EffectiveHoppRESTRequest
): Pick<
  HoppCodegenContext,
  "rawRequestBody" | "rawInput" | "contentType" | "bodyParams" | "rawParams"
> {
  return {
    contentType: request.body.contentType,
    rawInput: request.body.contentType !== "multipart/form-data",
    rawRequestBody:
      request.body.contentType !== "multipart/form-data"
        ? request.body.body
        : null,
    bodyParams:
      request.body.contentType === "multipart/form-data"
        ? request.body.body
        : [],
    rawParams:
      request.body.contentType !== "multipart/form-data"
        ? request.body.body
        : null,
  }
}

export function generateCodegenContext(
  request: EffectiveHoppRESTRequest
): HoppCodegenContext {
  return {
    ...getCodegenAuth(request),
    ...getCodegenGeneralRESTInfo(request),
    ...getCodegenReqBodyData(request),
  }
}
