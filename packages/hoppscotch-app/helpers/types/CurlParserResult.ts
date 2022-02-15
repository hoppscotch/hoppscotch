import { HoppRESTReqBody } from "@hoppscotch/data"
import { RESTMethod } from "./RESTMethod"

export type curlParserRequest = {
  url: string
  urlWithoutQuery: string
  compressed: boolean
  query: any // change it
  headers: Record<string, string>
  method: RESTMethod
  contentType: HoppRESTReqBody["contentType"]
  body: HoppRESTReqBody["body"]
  cookies: {
    [key: string]: string
  }
  cookieString: string
  multipartUploads: Record<string, string>
  auth?: {
    type: string
    token: string
  }
  user?: string
}
