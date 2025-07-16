import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"

import { TestDescriptor, ExpectationMethods } from "~/types"
import { createExpectation } from "~/utils/shared"

/**
 * Creates expectation methods for test assertions in post-request scripts
 */
export const createExpectationMethods = (
  ctx: CageModuleCtx,
  testRunStack: TestDescriptor[]
): ExpectationMethods => {
  const createExpect = (expectVal: any) =>
    createExpectation(expectVal, false, testRunStack)

  return {
    expectToBe: defineSandboxFn(
      ctx,
      "expectToBe",
      (expectVal: any, expectedVal: any) => {
        return createExpect(expectVal).toBe(expectedVal)
      }
    ),
    expectToBeLevel2xx: defineSandboxFn(
      ctx,
      "expectToBeLevel2xx",
      (expectVal: any) => {
        return createExpect(expectVal).toBeLevel2xx()
      }
    ),
    expectToBeLevel3xx: defineSandboxFn(
      ctx,
      "expectToBeLevel3xx",
      (expectVal: any) => {
        return createExpect(expectVal).toBeLevel3xx()
      }
    ),
    expectToBeLevel4xx: defineSandboxFn(
      ctx,
      "expectToBeLevel4xx",
      (expectVal: any) => {
        return createExpect(expectVal).toBeLevel4xx()
      }
    ),
    expectToBeLevel5xx: defineSandboxFn(
      ctx,
      "expectToBeLevel5xx",
      (expectVal: any) => {
        return createExpect(expectVal).toBeLevel5xx()
      }
    ),
    expectToBeType: defineSandboxFn(
      ctx,
      "expectToBeType",
      (expectVal: any, expectedType: any, isDate: any) => {
        const resolved =
          isDate && typeof expectVal === "string"
            ? new Date(expectVal)
            : expectVal
        return createExpectation(resolved, false, testRunStack).toBeType(
          expectedType
        )
      }
    ),
    expectToHaveLength: defineSandboxFn(
      ctx,
      "expectToHaveLength",
      (expectVal: any, expectedLength: any) => {
        return createExpect(expectVal).toHaveLength(expectedLength)
      }
    ),
    expectToInclude: defineSandboxFn(
      ctx,
      "expectToInclude",
      (expectVal: any, needle: any) => {
        return createExpect(expectVal).toInclude(needle)
      }
    ),

    // Negative expectations
    expectNotToBe: defineSandboxFn(
      ctx,
      "expectNotToBe",
      (expectVal: any, expectedVal: any) => {
        return createExpect(expectVal).not.toBe(expectedVal)
      }
    ),
    expectNotToBeLevel2xx: defineSandboxFn(
      ctx,
      "expectNotToBeLevel2xx",
      (expectVal: any) => {
        return createExpect(expectVal).not.toBeLevel2xx()
      }
    ),
    expectNotToBeLevel3xx: defineSandboxFn(
      ctx,
      "expectNotToBeLevel3xx",
      (expectVal: any) => {
        return createExpect(expectVal).not.toBeLevel3xx()
      }
    ),
    expectNotToBeLevel4xx: defineSandboxFn(
      ctx,
      "expectNotToBeLevel4xx",
      (expectVal: any) => {
        return createExpect(expectVal).not.toBeLevel4xx()
      }
    ),
    expectNotToBeLevel5xx: defineSandboxFn(
      ctx,
      "expectNotToBeLevel5xx",
      (expectVal: any) => {
        return createExpect(expectVal).not.toBeLevel5xx()
      }
    ),
    expectNotToBeType: defineSandboxFn(
      ctx,
      "expectNotToBeType",
      (expectVal: any, expectedType: any, isDate: any) => {
        const resolved =
          isDate && typeof expectVal === "string"
            ? new Date(expectVal)
            : expectVal
        return createExpectation(resolved, false, testRunStack).not.toBeType(
          expectedType
        )
      }
    ),
    expectNotToHaveLength: defineSandboxFn(
      ctx,
      "expectNotToHaveLength",
      (expectVal: any, expectedLength: any) => {
        return createExpect(expectVal).not.toHaveLength(expectedLength)
      }
    ),
    expectNotToInclude: defineSandboxFn(
      ctx,
      "expectNotToInclude",
      (expectVal: any, needle: any) => {
        return createExpect(expectVal).not.toInclude(needle)
      }
    ),
  }
}
