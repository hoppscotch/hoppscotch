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

    const restReq = parseCurlToHoppRESTReq(curlCommand)
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
          }
        }

        query = bodyJson.query
        variables = JSON.stringify(bodyJson.variables || {}, null, 2)
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
      },
    }
  } catch (_error) {
    return {
      status: "error",
    }
  }
}
