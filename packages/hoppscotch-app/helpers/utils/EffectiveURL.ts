import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import { combineLatest, Observable } from "rxjs"
import { map } from "rxjs/operators"
import {
  FormDataKeyValue,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { parseTemplateString, parseBodyEnvVariables } from "../templating"
import { arrayFlatMap, arraySort } from "../functional/array"
import { toFormData } from "../functional/formData"
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

// Resolves environment variables in the body
export const resolvesEnvsInBody = (
  body: HoppRESTReqBody,
  env: Environment
): HoppRESTReqBody => {
  if (!body.contentType) return body

  if (body.contentType === "multipart/form-data") {
    return {
      contentType: "multipart/form-data",
      body: body.body.map(
        (entry) =>
          <FormDataKeyValue>{
            active: entry.active,
            isFile: entry.isFile,
            key: parseTemplateString(entry.key, env.variables),
            value: entry.isFile
              ? entry.value
              : parseTemplateString(entry.value, env.variables),
          }
      ),
    }
  } else {
    return {
      contentType: body.contentType,
      body: parseTemplateString(body.body, env.variables),
    }
  }
}

function getFinalBodyFromRequest(
  request: HoppRESTRequest,
  env: Environment
): FormData | string | null {
  if (request.body.contentType === null) {
    return null
  }

  if (request.body.contentType === "multipart/form-data") {
    return pipe(
      request.body.body,
      A.filter((x) => x.key !== "" && x.active), // Remove empty keys

      // Sort files down
      arraySort((a, b) => {
        if (a.isFile) return 1
        if (b.isFile) return -1
        return 0
      }),

      // FormData allows only a single blob in an entry,
      // we split array blobs into separate entries (FormData will then join them together during exec)
      arrayFlatMap((x) =>
        x.isFile
          ? x.value.map((v) => ({
              key: parseTemplateString(x.key, env.variables),
              value: v as string | Blob,
            }))
          : [
              {
                key: parseTemplateString(x.key, env.variables),
                value: parseTemplateString(x.value, env.variables),
              },
            ]
      ),
      toFormData
    )
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
      if (addTo === "Headers") {
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
