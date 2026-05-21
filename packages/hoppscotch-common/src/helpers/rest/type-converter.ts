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
 *
 * If `gqlDraft` is provided (e.g. a previously-snapshotted GQL request kept by
 * the protocol switcher for round-trip preservation), it is restored verbatim
 * as the new request. Otherwise the GQL request is freshly seeded from the
 * REST request: name, endpoint→url, headers, auth (where compatible) are
 * preserved; query/variables fall back to defaults.
 */
export function convertRESTToGQL(
  doc: HoppRequestDocument,
  gqlDraft?: HoppGQLRequest
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

  const gqlRequest: HoppGQLRequest = gqlDraft ?? {
    v: GQL_REQ_SCHEMA_VERSION,
    _ref_id: restReq._ref_id ?? generateUniqueRefId("req"),
    // Preserve the backend id from the REST request so the personal-workspace
    // sync layer can issue an `editUserRequest` mutation against the existing
    // backend row instead of treating the protocol-switched request as
    // brand-new (which would short-circuit sync — `editRequest` reads
    // `request.id` to find the backend row, so dropping it silently disables
    // the network call).
    ...(restReq.id ? { id: restReq.id } : {}),
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
    description: restReq.description ?? null,
    responses: {},
  }

  return {
    type: "gql-request",
    request: gqlRequest,
    // Protocol conversion changes the persisted shape (REST ↔ GQL is not a
    // no-op against a saved collection entry), so always mark dirty on switch.
    // Without this, the user can switch, hit refresh, and the collection still
    // holds the pre-switch shape — silently losing their conversion.
    isDirty: true,
    cursorPosition: 0,
    saveContext: doc.saveContext,
    response: null,
    optionTabPreference: "query",
    inheritedProperties: doc.inheritedProperties,
  }
}

/**
 * Converts a GQL request document to a REST request document.
 *
 * If `restDraft` is provided (e.g. a previously-snapshotted REST request kept
 * by the protocol switcher for round-trip preservation), it is restored
 * verbatim as the new request. Otherwise the REST request is freshly seeded
 * from the GQL request: name, url→endpoint, headers, auth (where compatible)
 * are preserved; method/body/params fall back to defaults.
 */
export function convertGQLToREST(
  doc: HoppGQLRequestDocument,
  restDraft?: HoppRESTRequest
): HoppRequestDocument {
  const gqlReq = doc.request

  const defaultREST = getDefaultRESTRequest()

  const restRequest: HoppRESTRequest = restDraft ?? {
    v: RESTReqSchemaVersion,
    _ref_id: gqlReq._ref_id ?? generateUniqueRefId("req"),
    // See the mirror block in `convertRESTToGQL` — preserve the backend id so
    // sync can re-target the existing backend row instead of treating this as
    // a fresh request (which would skip the network call entirely).
    ...(gqlReq.id ? { id: gqlReq.id } : {}),
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
    // Mark dirty for the same reason as `convertRESTToGQL`: until the user
    // saves, the collection still holds the pre-switch GQL shape.
    isDirty: true,
    saveContext: doc.saveContext,
    response: null,
    optionTabPreference: "params",
    inheritedProperties: doc.inheritedProperties,
  }
}
