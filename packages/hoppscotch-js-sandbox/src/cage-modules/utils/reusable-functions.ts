import { HoppReusableFunction } from "@hoppscotch/data"
import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"

export function createReusableFunctionsMethods(
  ctx: CageModuleCtx,
  reusableFunctions: HoppReusableFunction[]
) {
  return {
    getReusableFunctionsCode: defineSandboxFn(
      ctx,
      "getReusableFunctionsCode",
      () => reusableFunctions.map(func => func.code).join('\n\n')
    )
  }
}