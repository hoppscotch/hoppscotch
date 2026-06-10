import {
  Environment,
  GQLHeader,
  HoppCollectionVariable,
  HoppGQLRequest,
  HoppRESTAuth,
  HoppRESTRequest,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { parse } from "graphql"
import type { OperationDefinitionNode } from "graphql"

import { getDefaultRESTRequest } from "~/helpers/rest/default"
import {
  InitialEnvironmentState,
  combineEnvVariables,
  filterNonEmptyEnvironmentVariables,
} from "~/helpers/RequestRunner"
import { getTemporaryVariables } from "~/helpers/runner/temp_envs"
import { getEffectiveHoppGQLRequest } from "~/helpers/utils/EffectiveURL"
import {
  generateAuthHeaders,
  generateAuthParams,
} from "~/helpers/auth/auth-types"
import { GQLRequest } from "~/helpers/kernel/gql/request"
import { RESTResponse } from "~/helpers/kernel/rest/response"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { getService } from "~/modules/dioc"

const kernelInterceptorService = getService(KernelInterceptorService)

export type GQLTestRunnerFailure =
  | { type: "subscription_unsupported" }
  | { type: "request_fail"; message: string }

/**
 * Picks the operation a collection-run should execute. Mirrors the tab
 * behaviour of defaulting to the first operation in the document — runs
 * don't have a cursor position to disambiguate with.
 */
const getRunnableOperation = (
  query: string
): E.Either<GQLTestRunnerFailure, OperationDefinitionNode | null> => {
  try {
    const ast = parse(query)
    const operations = ast.definitions.filter(
      (d): d is OperationDefinitionNode => d.kind === "OperationDefinition"
    )

    if (operations.length === 0) return E.right(null)

    const op = operations[0]
    if (op.operation === "subscription") {
      return E.left({ type: "subscription_unsupported" })
    }
    return E.right(op)
  } catch (_e) {
    // Let the server report the syntax error — it produces a real GraphQL
    // error response the user can read in the result panel, which beats a
    // client-side parse message.
    return E.right(null)
  }
}

/**
 * Executes a GraphQL request inside a collection run.
 *
 * The result is shaped as a `HoppRESTResponse`. For a run this is the honest
 * shape, not a coercion: a GraphQL-over-HTTP query/mutation is a single POST
 * returning a single HTTP response (status, headers, JSON body), and
 * `HoppRESTResponse` is the app's plain "HTTP response" type — so the runner
 * result tree, status chips, response lenses, run-meta accounting, and the
 * persistence schema all render it with zero protocol branches. The GQL
 * tab's `GQLResponseEvent[]` shape exists to model subscription event
 * streams, which runs skip — one-shot runs would carry that as dead weight
 * and force discrimination through every consumer.
 *
 * Known trade-off: GraphQL servers report operation errors as
 * `200 OK` + `{ errors: [...] }` in the body, so such rows chip green
 * (HTTP-level truth; REST rows behave the same for error payloads).
 * Surfacing body-level GraphQL errors on the row is a planned enhancement
 * in `runTestGQLRequest` — purely additive, no change to this shape.
 *
 * Mirrors `runTestRunnerRequest` minus the script stages: GraphQL requests
 * carry no pre-request/test scripts (not in the v10 schema), so runs execute
 * the operation and report the transport result only.
 *
 * The `request` arrives with auth already resolved by the test-runner
 * service walk; inherited headers are passed separately so auth headers can
 * be applied between them and the request's own headers
 * (precedence: request > auth > inherited).
 */
export async function runTestRunnerGQLRequest(
  request: HoppGQLRequest,
  persistEnv = true,
  inheritedVariables: HoppCollectionVariable[] = [],
  initialEnvironmentState: InitialEnvironmentState,
  inheritedHeaders: GQLHeader[] = []
): Promise<E.Either<GQLTestRunnerFailure, { response: HoppRESTResponse }>> {
  const { initialEnvs } = initialEnvironmentState

  const envVars = filterNonEmptyEnvironmentVariables(
    combineEnvVariables({
      environments: {
        selected: initialEnvs.selected,
        global: initialEnvs.global,
        temp: !persistEnv ? getTemporaryVariables() : [],
      },
      // GraphQL requests have no request-level variables (REST-style
      // requestVariables) — collection variables are the innermost scope.
      requestVariables: [],
      collectionVariables: inheritedVariables as Environment["variables"],
    })
  ) as Environment["variables"]

  const effective = getEffectiveHoppGQLRequest(request, envVars, {
    inheritedHeaders,
  })

  // Detect on the env-resolved query — a templated document (e.g. the whole
  // query in a `<<doc>>` variable) only reveals its operations after
  // substitution.
  const operationResult = getRunnableOperation(effective.effectiveFinalQuery)
  if (E.isLeft(operationResult)) return operationResult
  const operation = operationResult.right

  // Synthetic REST request for auth signing and the response viewer's `req`
  // field. Truthful for GraphQL-over-HTTP: a POST to the resolved URL.
  // Signing-sensitive auth types (AWS, digest, HAWK) hash exactly this
  // method + URL pair.
  const syntheticRESTRequest: HoppRESTRequest = {
    ...getDefaultRESTRequest(),
    name: request.name,
    method: "POST",
    endpoint: effective.effectiveFinalURL,
  }

  // GQL auth is a structural subset of REST auth for the shared types, and
  // collection-inherited auth can legitimately be a REST-only type (digest,
  // HAWK, JWT…) — the REST generators handle the full union, so GraphQL
  // requests get complete auth coverage in runs.
  const effectiveAuth = effective.effectiveFinalAuth as HoppRESTAuth

  const authHeaders = effectiveAuth.authActive
    ? await generateAuthHeaders(effectiveAuth, syntheticRESTRequest, envVars)
    : []
  const authParams = effectiveAuth.authActive
    ? await generateAuthParams(effectiveAuth, syntheticRESTRequest, envVars)
    : []

  let finalUrl = effective.effectiveFinalURL
  if (authParams.length > 0) {
    try {
      const urlObj = new URL(finalUrl)
      for (const param of authParams) {
        urlObj.searchParams.append(param.key, param.value)
      }
      finalUrl = urlObj.toString()
    } catch (_e) {
      // Unparseable URL — let the network layer surface the real error.
    }
  }

  // Precedence: request > auth > inherited (same as the tab execution path).
  const finalHeaders: Record<string, string> = {}
  effective.effectiveFinalHeaders.forEach((h) => {
    finalHeaders[h.key] = h.value
  })
  authHeaders.forEach((h) => {
    finalHeaders[h.key] = h.value
  })
  effective.effectiveFinalRequestHeaders.forEach((h) => {
    finalHeaders[h.key] = h.value
  })

  const gqlRequest: HoppGQLRequest = {
    v: 10,
    name: request.name,
    url: finalUrl,
    headers: Object.entries(finalHeaders).map(([key, value]) => ({
      active: true,
      key,
      value,
      description: "",
    })),
    query: effective.effectiveFinalQuery,
    variables: effective.effectiveFinalVariables,
    auth: effective.effectiveFinalAuth,
    description: null,
    responses: {},
  }

  try {
    const kernelRequest = await GQLRequest.toRequest(gqlRequest)

    // Multi-operation documents need an explicit operationName — match the
    // tab behaviour of running the first operation.
    if (operation?.name?.value && kernelRequest.content?.kind === "json") {
      const jsonContent = kernelRequest.content.content as Record<
        string,
        unknown
      >
      jsonContent.operationName = operation.name.value
    }

    const { response } = kernelInterceptorService.execute(kernelRequest)
    const result = await response

    if (E.isLeft(result)) {
      const message =
        result.left === "cancellation"
          ? "Request cancelled"
          : (result.left.humanMessage?.heading ??
            result.left.error?.message ??
            "Request execution failed")
      return E.left({ type: "request_fail", message })
    }

    const parsedResponse = await RESTResponse.toResponse(
      result.right,
      syntheticRESTRequest
    )

    if (parsedResponse.type === "fail") {
      return E.left({
        type: "request_fail",
        message: parsedResponse.error.message,
      })
    }

    return E.right({ response: parsedResponse })
  } catch (error) {
    return E.left({
      type: "request_fail",
      message:
        error instanceof Error ? error.message : "Request execution failed",
    })
  }
}
