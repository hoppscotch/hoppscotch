import {
  EnvironmentVariable,
  HoppCollection,
  HoppGQLRequest,
  HoppRESTAuth,
  HoppRESTRequest,
  getDefaultRESTRequest,
  parseTemplateString,
} from "@hoppscotch/data";
import * as E from "fp-ts/Either";
import { parse } from "graphql";
import type { OperationDefinitionNode } from "graphql";

import { HoppCLIError, error } from "../types/errors";

/**
 * A GraphQL request converted to a REST-shaped POST so the CLI's existing
 * pipeline (templating, auth, scripts, metrics, reporting) runs it unchanged.
 *
 * `gqlRaw` carries the untemplated query/variables; the wire payload is
 * assembled by {@link buildEffectiveGQLPayload} AFTER env templating —
 * assembling earlier would JSON-escape the text before substitution and
 * corrupt the payload on env values containing quotes or newlines.
 */
export interface GQLStubRequest extends HoppRESTRequest {
  gqlRaw: { query: string; variables: string };
}

export const isGQLStubRequest = (
  request: HoppRESTRequest
): request is GQLStubRequest => "gqlRaw" in request;

/**
 * Converts a GraphQL request into a {@link GQLStubRequest}. Header/auth
 * merging matches the app runner: inactive headers are dropped BEFORE the
 * merge (so they can't suppress an active parent header), and `inherit`
 * auth falls back to the parent only when active.
 */
export const preProcessGQLRequest = (
  request: HoppGQLRequest,
  collection: HoppCollection
): GQLStubRequest => {
  const requestHeaders = (request.headers ?? []).filter(
    (header) => header.active && header.key !== ""
  );
  const parentHeaders = (collection.headers ?? []).filter(
    (header) => header.active && header.key !== ""
  );
  const headers = [
    ...parentHeaders.filter(
      (parentHeader) =>
        !requestHeaders.some((header) => header.key === parentHeader.key)
    ),
    ...requestHeaders,
  ];

  // GQL auth is a structural subset of REST auth; inherited collection auth
  // can be a REST-only type (digest, HAWK, JWT…)
  const requestAuth = (request.auth ?? {
    authType: "none",
    authActive: false,
  }) as HoppRESTAuth;
  const auth: HoppRESTAuth =
    requestAuth.authType === "inherit"
      ? requestAuth.authActive && collection.auth
        ? (collection.auth as HoppRESTAuth)
        : { authType: "none", authActive: false }
      : requestAuth;

  return {
    ...getDefaultRESTRequest(),
    name: request.name || "Untitled Request",
    method: "POST",
    endpoint: request.url ?? "",
    params: [],
    headers,
    auth,
    preRequestScript: request.preRequestScript ?? "",
    testScript: request.testScript ?? "",
    // Placeholder — replaced from `gqlRaw` at effective-request time
    body: { contentType: "application/json", body: "" },
    requestVariables: [],
    gqlRaw: {
      query: request.query ?? "",
      variables: request.variables ?? "",
    },
  };
};

/**
 * Assembles the GraphQL-over-HTTP JSON payload with env templating applied,
 * mirroring the app's collection runner: the FIRST operation of the
 * ENV-RESOLVED document runs (templated documents only reveal their
 * operations after substitution), subscriptions and invalid variables JSON
 * fail the row before any network call, and unparseable documents are sent
 * as-is for the server to report.
 */
export const buildEffectiveGQLPayload = (
  request: GQLStubRequest,
  envVariables: EnvironmentVariable[]
): E.Either<HoppCLIError, string> => {
  const query = parseTemplateString(request.gqlRaw.query, envVariables);
  // No trim — the app kernel JSON.parses non-empty text as-is, so
  // whitespace-only variables fail identically in both runners
  const variablesText = parseTemplateString(
    request.gqlRaw.variables,
    envVariables
  );

  let operation: OperationDefinitionNode | null = null;
  try {
    const operations = parse(query).definitions.filter(
      (definition): definition is OperationDefinitionNode =>
        definition.kind === "OperationDefinition"
    );
    operation = operations[0] ?? null;
  } catch (_e) {
    // Unparseable document — the server's GraphQL error beats a client-side
    // parse message
  }

  if (operation?.operation === "subscription") {
    return E.left(
      error({
        code: "REQUEST_ERROR",
        data: `GraphQL subscriptions are not supported in the CLI runner: ${request.name}`,
      })
    );
  }

  let variables: unknown = undefined;
  if (variablesText) {
    try {
      variables = JSON.parse(variablesText);
    } catch (_e) {
      return E.left(
        error({
          code: "REQUEST_ERROR",
          data: `Invalid JSON in GraphQL variables: ${request.name}`,
        })
      );
    }
  }

  const payload: Record<string, unknown> = { query };
  if (variables !== undefined) payload.variables = variables;
  if (operation?.name?.value) payload.operationName = operation.name.value;

  return E.right(JSON.stringify(payload));
};
