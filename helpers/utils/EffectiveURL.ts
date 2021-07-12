import { combineLatest, Observable } from "rxjs"
import { map } from "rxjs/operators"
import { HoppRESTRequest } from "../types/HoppRESTRequest"
import { Environment } from "~/newstore/environments"

interface EffectiveHoppRESTRequest extends HoppRESTRequest {
  /**
   * The effective final URL.
   *
   * This contains path, params and environment variables all applied to it
   */
  effectiveFinalURL: string
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
    map(([request, _env]) => {
      // TODO: Change this
      return {
        ...request,
        effectiveFinalURL: request.endpoint,
      }
    })
  )
}
