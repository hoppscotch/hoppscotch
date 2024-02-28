import { parse, print } from "graphql"
import { HoppGQLRequest, GQL_REQ_SCHEMA_VERSION } from "@hoppscotch/data"

const DEFAULT_QUERY = print(
  parse(
    `
      query Request {
        method
        url
        headers {
          key
          value
        }
      }
    `,
    { allowLegacyFragmentVariables: true }
  )
)

export const getDefaultGQLRequest = (): HoppGQLRequest => ({
  v: GQL_REQ_SCHEMA_VERSION,
  name: "Untitled",
  url: "https://echo.hoppscotch.io/graphql",
  headers: [],
  variables: `{
  "id": "1"
}`,
  query: DEFAULT_QUERY,
  auth: {
    authType: "inherit",
    authActive: true,
  },
})
