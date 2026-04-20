import { HoppRESTRequest } from "@hoppscotch/data"
import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"

import type { PmNamespaceMethods } from "~/types"

/**
 * Creates pm (Postman compatibility) namespace methods for the sandbox environment
 * Provides Postman-compatible APIs for request information
 */
export const createPmNamespaceMethods = (
  ctx: CageModuleCtx,
  config: {
    request: HoppRESTRequest
    setNextRequest: (requestNameOrId: string | null) => void
  }
): PmNamespaceMethods => {
  return {
    // `pm` namespace methods for Postman compatibility
    pmInfoRequestName: defineSandboxFn(ctx, "pmInfoRequestName", () => {
      return config.request.name
    }),
    pmInfoRequestId: defineSandboxFn(ctx, "pmInfoRequestId", () => {
      // Use request.id if available, fallback to request.name
      // Postman uses a unique ID, but for compatibility we use name if ID not set
      return config.request.id || config.request.name
    }),
    pmSetNextRequest: defineSandboxFn(
      ctx,
      "pmSetNextRequest",
      (requestNameOrId: unknown) => {
        if (requestNameOrId !== null && typeof requestNameOrId !== "string") {
          throw new TypeError(
            "pm.execution.setNextRequest() expects a string or null"
          )
        }

        config.setNextRequest(requestNameOrId)
      }
    ),
  }
}
