import { combineLatest, Observable } from "rxjs"
import { map } from "rxjs/operators"
import { FormDataKeyValue, HoppRESTRequest } from "@hoppscotch/data"
import { parseTemplateString, parseBodyEnvVariables } from "../templating"
import { Environment, getGlobalVariables } from "~/newstore/environments"

export interface EffectiveHoppRESTRequest extends HoppRESTRequest {
  /**
   * The effective final URL.
   *
   * This contains path, params and environment variables all applied to it
   */
  effectiveFinalURL: string
  effectiveFinalHeaders: { key: string; value: string }[]
  effectiveFinalParams: { key: string; value: string }[]
  effectiveFinalBody: FormData | string | null
}

function getFinalBodyFromRequest(
  request: HoppRESTRequest,
  env: Environment
): FormData | string | null {
  if (request.body.contentType === null) {
    return null
  }

  if (request.body.contentType === "multipart/form-data") {
    const formData = new FormData()

    request.body.body
      .filter((x) => x.key !== "" && x.active) // Remove empty keys
      .map(
        (x) =>
          <FormDataKeyValue>{
            active: x.active,
            isFile: x.isFile,
            key: parseTemplateString(x.key, env.variables),
            value: x.isFile
              ? x.value
              : parseTemplateString(x.value, env.variables),
          }
      )
      .forEach((entry) => {
        if (!entry.isFile) formData.append(entry.key, entry.value)
        else entry.value.forEach((blob) => formData.append(entry.key, blob))
      })

    return formData
  } else return parseBodyEnvVariables(request.body.body, env.variables)
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
  const envVariables = [...environment.variables, ...getGlobalVariables()]

  const effectiveFinalHeaders = request.headers
    .filter(
      (x) =>
        x.key !== "" && // Remove empty keys
        x.active // Only active
    )
    .map((x) => ({
      // Parse out environment template strings
      active: true,
      key: parseTemplateString(x.key, envVariables),
      value: parseTemplateString(x.value, envVariables),
    }))

  const effectiveFinalParams = request.params
    .filter(
      (x) =>
        x.key !== "" && // Remove empty keys
        x.active // Only active
    )
    .map((x) => ({
      active: true,
      key: parseTemplateString(x.key, envVariables),
      value: parseTemplateString(x.value, envVariables),
    }))

  // Authentication
  if (request.auth.authActive) {
    // TODO: Support a better b64 implementation than btoa ?
    if (request.auth.authType === "basic") {
      const username = parseTemplateString(request.auth.username, envVariables)
      const password = parseTemplateString(request.auth.password, envVariables)

      effectiveFinalHeaders.push({
        active: true,
        key: "Authorization",
        value: `Basic ${btoa(`${username}:${password}`)}`,
      })
    } else if (
      request.auth.authType === "bearer" ||
      request.auth.authType === "oauth-2"
    ) {
      effectiveFinalHeaders.push({
        active: true,
        key: "Authorization",
        value: `Bearer ${parseTemplateString(
          request.auth.token,
          envVariables
        )}`,
      })
    } else if (request.auth.authType === "api-key") {
      const { key, value, addTo } = request.auth

      if (addTo === "Header") {
        effectiveFinalHeaders.push({
          active: true,
          key: parseTemplateString(key, envVariables),
          value: parseTemplateString(value, envVariables),
        })
      } else if (addTo === "Query params") {
        effectiveFinalParams.push({
          active: true,
          key: parseTemplateString(key, envVariables),
          value: parseTemplateString(value, envVariables),
        })
      }
    }
  }

  const effectiveFinalBody = getFinalBodyFromRequest(request, environment)
  if (request.body.contentType)
    effectiveFinalHeaders.push({
      active: true,
      key: "content-type",
      value: request.body.contentType,
    })

  return {
    ...request,
    effectiveFinalURL: parseTemplateString(request.endpoint, envVariables),
    effectiveFinalHeaders,
    effectiveFinalParams,
    effectiveFinalBody,
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
