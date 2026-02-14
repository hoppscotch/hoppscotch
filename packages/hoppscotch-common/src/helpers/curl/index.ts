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
    variables: string | undefined
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
}

export type ParseCurlToGQLResult = ParseCurlToGQLSuccess | ParseCurlToGQLError

export const parseCurlToGQL = (curlCommand: string): ParseCurlToGQLResult => {
  try {
    if (!/^curl(\s|$)/i.test(curlCommand.trim())) {
      return {
        status: "error",
      }
    }

    const restReq = parseCurlToHoppRESTReq(curlCommand.trim())
    const body = typeof restReq.body.body === "string" ? restReq.body.body : ""

    let query = ""
    let variables: string | undefined = undefined

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
          }
        }

        query = bodyJson.query
        if (bodyJson.variables && Object.keys(bodyJson.variables).length > 0) {
          variables = JSON.stringify(bodyJson.variables, null, 2)
        }
      } else {
        query = body
        variables = "{}"
      }
    } catch (_error) {
      query = body
      variables = "{}"
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
  } catch (_error) {
    return {
      status: "error",
    }
  }
}
