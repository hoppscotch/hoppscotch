import {
  HoppRESTReqBody,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTAuth,
} from "@hoppscotch/data"

export type curlParserRequest = {
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
