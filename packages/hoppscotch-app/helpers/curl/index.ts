import {
  HoppRESTReqBody,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTAuth,
} from "@hoppscotch/data"
import { flow } from "fp-ts/function"
import cloneDeep from "lodash/cloneDeep"
import { parseCurlCommand, requestToHoppRequest } from "./curlparser"

export type CurlParserRequest = {
  urlString: string
  urlObject: URL | undefined
  compressed: boolean
  queries: HoppRESTParam[]
  hoppHeaders: HoppRESTHeader[]
  method: string
  contentType: HoppRESTReqBody["contentType"]
  body: HoppRESTReqBody["body"]
  cookies: Record<string, string> | undefined
  cookieString: string
  multipartUploads: Record<string, string>
  isDataBinary: boolean
  auth: HoppRESTAuth
}

export const parseCurlToHoppRESTReq = flow(
  parseCurlCommand,
  requestToHoppRequest,
  cloneDeep
)
