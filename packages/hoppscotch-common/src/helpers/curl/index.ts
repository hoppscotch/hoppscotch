import { HoppGQLAuth } from "@hoppscotch/data"
import { flow } from "fp-ts/function"
import { cloneDeep } from "lodash-es"
import { parseCurlCommand } from "./curlparser"

export const parseCurlToHoppRESTReq = flow(parseCurlCommand, cloneDeep)

type ParseCurlToGQLSuccess = {
  status: "ok"
  data: {
    url: string
    query: string
    variables: string
    headers: {
      key: string
      value: string
      active: boolean
      description: string
    }[]
    auth: HoppGQLAuth
  }
}

type ParseCurlToGQLError = {
  status: "error"
  message?: string
}

export type ParseCurlToGQLResult = ParseCurlToGQLSuccess | ParseCurlToGQLError

export const parseCurlToGQL = (curlCommand: string): ParseCurlToGQLResult => {
  try {
    const trimmedCurl = curlCommand.trim()
    if (!/^curl(\s|$)/i.test(trimmedCurl)) {
      return {
        status: "error",
        message: "invalid_curl_format",
      }
    }

    const restReq = parseCurlToHoppRESTReq(trimmedCurl)
    const body = typeof restReq.body.body === "string" ? restReq.body.body : ""

    let query = ""
    let variables = "{}"

    try {
      const bodyJson = JSON.parse(body || "{}")

      if (
        typeof bodyJson === "object" &&
        bodyJson !== null &&
        "query" in bodyJson
      ) {
        if (typeof bodyJson.query !== "string") {
          return {
            status: "error",
            message: "curl_invalid_gql_query",
          }
        }

        query = bodyJson.query
        if (bodyJson.variables && typeof bodyJson.variables === "object") {
          variables = JSON.stringify(bodyJson.variables, null, 2)
        }
      } else {
        query = body
      }
    } catch (_error) {
      query = body
    }

    return {
      status: "ok",
      data: {
        url: restReq.endpoint,
        query,
        variables,
        headers: restReq.headers,
        auth: restReq.auth,
      },
    }
  } catch (error: any) {
    return {
      status: "error",
      message: error?.message ?? "unknown_error",
    }
  }
}
