import { HoppRESTReqBody } from "@hoppscotch/data"

export type curlParserRequest = {
  url: string
  urlWithoutQuery: string
  compressed: boolean
  query: any // change it
  headers: any // change it
  method: string
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
