import { HoppGQLRequest, GQL_REQ_SCHEMA_VERSION } from "@hoppscotch/data"

export const getDefaultGQLRequest = (): HoppGQLRequest => ({
  v: GQL_REQ_SCHEMA_VERSION,
  name: "Untitled",
  // url: "https://echo.hoppscotch.io/graphql",
  url: "http://localhost:4000",
  headers: [],
  variables: `{
  "id": "1"
}`,
  query: `query Request {
method
url
headers {
  key
  value
  }
}
`,
  auth: {
    authType: "none",
    authActive: true,
  },
})
