import { combineLatest, Observable } from "rxjs"
import { map } from "rxjs/operators"
import { HoppRESTRequest } from "../types/HoppRESTRequest"
import parseTemplateString from "../templating"
import { Environment } from "~/newstore/environments"

export interface EffectiveHoppRESTRequest extends HoppRESTRequest {
  /**
   * The effective final URL.
   *
   * This contains path, params and environment variables all applied to it
   */
  effectiveFinalURL: string
  effectiveFinalHeaders: { key: string; value: string }[]
  effectiveFinalParams: { key: string; value: string }[]
}

/**
 * Outputs an executable request format with environment variables applied
 *
 * @param request The request to source from
 * @param environment The environment to apply
 *
 * @returns An object with extra fields defining a complete request
 */
export function getEffectiveRESTRequest(
  request: HoppRESTRequest,
  environment: Environment
): EffectiveHoppRESTRequest {
  const effectiveFinalHeaders = request.headers
    .filter(
      (x) =>
        x.key !== "" && // Remove empty keys
        x.active // Only active
    )
    .map((x) => ({
      // Parse out environment template strings
      active: true,
      key: parseTemplateString(x.key, environment.variables),
      value: parseTemplateString(x.value, environment.variables),
    }))

  // Authentication
  if (request.auth.authActive) {
    // TODO: Support a better b64 implementation than btoa ?
    if (request.auth.authType === "basic") {
      effectiveFinalHeaders.push({
        active: true,
        key: "Authorization",
        value: `Basic ${btoa(
          `${request.auth.username}:${request.auth.password}`
        )}`,
      })
    } else if (request.auth.authType === "bearer") {
      effectiveFinalHeaders.push({
        active: true,
        key: "Authorization",
        value: `Bearer ${request.auth.token}`,
      })
    }
  }

  return {
    ...request,
    effectiveFinalURL: parseTemplateString(
      request.endpoint,
      environment.variables
    ),
    effectiveFinalHeaders,
    effectiveFinalParams: request.params
      .filter(
        (x) =>
          x.key !== "" && // Remove empty keys
          x.active // Only active
      )
      .map((x) => ({
        active: true,
        key: parseTemplateString(x.key, environment.variables),
        value: parseTemplateString(x.value, environment.variables),
      })),
  }
}

/**
 * Creates an Observable Stream that emits HoppRESTRequests whenever
 * the input streams emit a value
 *
 * @param request$ The request stream containing request data
 * @param environment$ The environment stream containing environment data to apply
 *
 * @returns Observable Stream for the Effective Request Object
 */
export function getEffectiveRESTRequestStream(
  request$: Observable<HoppRESTRequest>,
  environment$: Observable<Environment>
): Observable<EffectiveHoppRESTRequest> {
  return combineLatest([request$, environment$]).pipe(
    map(([request, env]) => getEffectiveRESTRequest(request, env))
  )
}
