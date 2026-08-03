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
} from "~/helpers/tab/document"
import type { ProtocolDraft } from "~/services/tab"

/**
 * Re-stamps a restored protocol draft with the live request's identity.
 *
 * Drafts are snapshots from the previous switch, so their `id`/`_ref_id` go
 * stale — the request may have been saved (gaining an id) or repointed by a
 * "Save as" since. Restoring verbatim either duplicates the backend row or
 * overwrites another collection's request. Content stays the draft's.
 */
const restoreDraftIdentity = <T extends { id?: string; _ref_id?: string }>(
  draft: T,
  source: { id?: string; _ref_id?: string }
): T => {
  const restored: T = {
    ...draft,
    _ref_id: source._ref_id ?? draft._ref_id ?? generateUniqueRefId("req"),
  }

  if (source.id) restored.id = source.id
  else delete restored.id

  return restored
}

/**
 * Converts a REST request document to a GQL request document.
 *
 * A `gqlDraft` (kept by the protocol switcher for round-trip preservation)
 * restores its content, with identity re-stamped via `restoreDraftIdentity`.
 * Otherwise the GQL request is seeded from the REST one: name, headers and
 * compatible auth carry over; URL, query and variables fall back to defaults.
 */
export function convertRESTToGQL(
  doc: HoppRequestDocument,
  gqlDraft?: ProtocolDraft<HoppGQLRequest>
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

  const gqlRequest: HoppGQLRequest = gqlDraft
    ? restoreDraftIdentity(gqlDraft.request, restReq)
    : {
        v: GQL_REQ_SCHEMA_VERSION,
        _ref_id: restReq._ref_id ?? generateUniqueRefId("req"),
        // Preserve the backend id so sync can issue `editUserRequest` against
        // the existing row — `editRequest` reads `request.id` to find it
        ...(restReq.id ? { id: restReq.id } : {}),
        name: restReq.name,
        // A REST path isn't a GraphQL endpoint; the real URL comes back via
        // the `gqlDraft` branch above
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
        // Scripts are protocol-agnostic — carry them instead of dropping code
        preRequestScript: restReq.preRequestScript,
        testScript: restReq.testScript,
      }

  return {
    type: "gql-request",
    request: gqlRequest,
    // A fresh conversion diverges from the saved entry, so it's dirty. A
    // restored draft carries the flag it was snapshotted with — round-tripping
    // a saved request back to its original shape leaves it clean
    isDirty: gqlDraft?.isDirty ?? true,
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
 * Mirror of `convertRESTToGQL`: a `restDraft` restores its content with
 * identity re-stamped, otherwise the REST request is seeded from the GQL one.
 */
export function convertGQLToREST(
  doc: HoppGQLRequestDocument,
  restDraft?: ProtocolDraft<HoppRESTRequest>
): HoppRequestDocument {
  const gqlReq = doc.request

  const defaultREST = getDefaultRESTRequest()

  const restRequest: HoppRESTRequest = restDraft
    ? restoreDraftIdentity(restDraft.request, gqlReq)
    : {
        v: RESTReqSchemaVersion,
        _ref_id: gqlReq._ref_id ?? generateUniqueRefId("req"),
        // Mirror of `convertRESTToGQL` — preserve the backend id for sync
        ...(gqlReq.id ? { id: gqlReq.id } : {}),
        name: gqlReq.name,
        // Cross-protocol URLs aren't interchangeable; the real endpoint comes
        // back via the `restDraft` branch
        endpoint: defaultREST.endpoint,
        method: "GET",
        params: [],
        headers: gqlReq.headers.map((h) => ({
          key: h.key,
          value: h.value,
          active: h.active,
          description: h.description,
        })),
        // Scripts are protocol-agnostic — carry them instead of dropping code
        preRequestScript: gqlReq.preRequestScript ?? "",
        testScript: gqlReq.testScript ?? "",
        body: {
          contentType: null,
          body: null,
        },
        // Safe cast: every GQL auth variant is a REST one. The reverse needs
        // the guard above because REST has auth types GQL lacks
        auth: gqlReq.auth as HoppRESTRequest["auth"],
        requestVariables: [],
        responses: {},
        description: gqlReq.description ?? "",
      }

  return {
    type: "request",
    request: restRequest,
    // Same reasoning as `convertRESTToGQL`
    isDirty: restDraft?.isDirty ?? true,
    saveContext: doc.saveContext,
    response: null,
    optionTabPreference: "params",
    inheritedProperties: doc.inheritedProperties,
  }
}
