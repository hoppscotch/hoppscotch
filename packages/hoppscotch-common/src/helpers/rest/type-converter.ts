import {
  HoppGQLRequest,
  HoppRESTRequest,
  GQL_REQ_SCHEMA_VERSION,
  RESTReqSchemaVersion,
  generateUniqueRefId,
  getDefaultGQLRequest,
  getDefaultRESTRequest,
} from "@hoppscotch/data"
import {
  HoppRequestDocument,
  HoppGQLRequestDocument,
} from "~/helpers/rest/document"

/**
 * Converts a REST request document to a GQL request document.
 * Preserves: name, URL (endpoint→url), headers, auth where compatible.
 * Creates default GQL query.
 */
export function convertRESTToGQL(
  doc: HoppRequestDocument
): HoppGQLRequestDocument {
  const restReq = doc.request

  // Map shared auth types (GQL supports a subset of REST auth types)
  const gqlCompatibleAuthTypes = [
    "none",
    "inherit",
    "basic",
    "bearer",
    "oauth-2",
    "api-key",
    "aws-signature",
  ]

  const auth = gqlCompatibleAuthTypes.includes(restReq.auth.authType)
    ? (restReq.auth as HoppGQLRequest["auth"])
    : { authType: "inherit" as const, authActive: true }

  const defaultGQL = getDefaultGQLRequest()

  const gqlRequest: HoppGQLRequest = {
    v: GQL_REQ_SCHEMA_VERSION,
    _ref_id: restReq._ref_id ?? generateUniqueRefId("req"),
    name: restReq.name,
    url: defaultGQL.url,
    headers: restReq.headers.map((h) => ({
      key: h.key,
      value: h.value,
      active: h.active,
      description: h.description,
    })),
    query: defaultGQL.query,
    variables: defaultGQL.variables,
    auth,
  }

  return {
    type: "gql-request",
    request: gqlRequest,
    isDirty: doc.isDirty,
    cursorPosition: 0,
    saveContext: doc.saveContext,
    response: null,
    optionTabPreference: "query",
    inheritedProperties: doc.inheritedProperties,
  }
}

/**
 * Converts a GQL request document to a REST request document.
 * Preserves: name, URL (url→endpoint), headers, auth where compatible.
 * Sets method to POST (standard for GraphQL over HTTP).
 */
export function convertGQLToREST(
  doc: HoppGQLRequestDocument
): HoppRequestDocument {
  const gqlReq = doc.request

  const defaultREST = getDefaultRESTRequest()

  const restRequest: HoppRESTRequest = {
    v: RESTReqSchemaVersion,
    _ref_id: generateUniqueRefId("req"),
    name: gqlReq.name,
    endpoint: defaultREST.endpoint,
    method: "GET",
    params: [],
    headers: gqlReq.headers.map((h) => ({
      key: h.key,
      value: h.value,
      active: h.active,
      description: h.description,
    })),
    preRequestScript: "",
    testScript: "",
    body: {
      contentType: null,
      body: null,
    },
    auth: gqlReq.auth as HoppRESTRequest["auth"],
    requestVariables: [],
    responses: {},
    description: gqlReq.description ?? "",
  }

  return {
    type: "request",
    request: restRequest,
    isDirty: doc.isDirty,
    saveContext: doc.saveContext,
    response: null,
    optionTabPreference: "params",
    inheritedProperties: doc.inheritedProperties,
  }
}
