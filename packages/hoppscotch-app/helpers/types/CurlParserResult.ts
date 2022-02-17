import {
  HoppRESTReqBody,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTAuth,
} from "@hoppscotch/data"
import { RESTMethod } from "./RESTMethod"

export type curlParserRequest = {
  urlString: string
  urlObject: URL | undefined
  compressed: boolean
  queries: HoppRESTParam[]
  hoppHeaders: HoppRESTHeader[]
  method: RESTMethod
  contentType: HoppRESTReqBody["contentType"]
  body: HoppRESTReqBody["body"]
  cookies:
    | {
        [key: string]: string
      }
    | undefined
  cookieString: string
  multipartUploads: Record<string, string>
  isDataBinary: boolean
  auth: HoppRESTAuth
}
