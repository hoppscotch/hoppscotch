import { HoppRESTRequest, RESTReqSchemaVersion } from "@hoppscotch/data"

export const getDefaultRESTRequest = (): HoppRESTRequest => ({
  v: RESTReqSchemaVersion,
  endpoint: "https://echo.hoppscotch.io", // Public echo service — no Zapro-branded equivalent yet
  name: "Untitled",
  params: [],
  headers: [],
  method: "GET",
  auth: {
    authType: "inherit",
    authActive: true,
  },
  preRequestScript: "",
  testScript: "",
  body: {
    contentType: null,
    body: null,
  },
  requestVariables: [],
  responses: {},
})
