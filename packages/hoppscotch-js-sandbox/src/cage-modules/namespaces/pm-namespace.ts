import { HoppRESTRequest } from "@hoppscotch/data"
import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"

import type { PmNamespaceMethods } from "~/types"

/**
 * Creates pm (Postman compatibility) namespace methods for the sandbox environment
 * Provides Postman-compatible APIs for request information
 */
export const createPmNamespaceMethods = (
  ctx: CageModuleCtx,
  config: { request: HoppRESTRequest }
): PmNamespaceMethods => {
  return {
    // `pm` namespace methods for Postman compatibility
    pmInfoRequestName: defineSandboxFn(ctx, "pmInfoRequestName", () => {
      return config.request.name
    }),
    pmInfoRequestId: defineSandboxFn(ctx, "pmInfoRequestId", () => {
      return config.request.id
    }),
  }
}
