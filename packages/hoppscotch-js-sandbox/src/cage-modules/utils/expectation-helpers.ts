import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"

import { TestDescriptor, ExpectationMethods, SandboxValue } from "~/types"
import { createExpectation } from "~/utils/shared"

/**
 * Creates expectation methods for test assertions in post-request scripts
 */
export const createExpectationMethods = (
  ctx: CageModuleCtx,
  testRunStack: TestDescriptor[],
  getCurrentTestContext?: () => TestDescriptor | null
): ExpectationMethods => {
  const createExpect = (expectVal: SandboxValue) =>
    createExpectation(expectVal, false, testRunStack, getCurrentTestContext)

  return {
    expectToBe: defineSandboxFn(
      ctx,
      "expectToBe",
      (expectVal: SandboxValue, expectedVal: SandboxValue) => {
        return createExpect(expectVal).toBe(expectedVal)
      }
    ),
    expectToBeLevel2xx: defineSandboxFn(
      ctx,
      "expectToBeLevel2xx",
      (expectVal: SandboxValue) => {
        return createExpect(expectVal).toBeLevel2xx()
      }
    ),
    expectToBeLevel3xx: defineSandboxFn(
      ctx,
      "expectToBeLevel3xx",
      (expectVal: SandboxValue) => {
        return createExpect(expectVal).toBeLevel3xx()
      }
    ),
    expectToBeLevel4xx: defineSandboxFn(
      ctx,
      "expectToBeLevel4xx",
      (expectVal: SandboxValue) => {
        return createExpect(expectVal).toBeLevel4xx()
      }
    ),
    expectToBeLevel5xx: defineSandboxFn(
      ctx,
      "expectToBeLevel5xx",
      (expectVal: SandboxValue) => {
        return createExpect(expectVal).toBeLevel5xx()
      }
    ),
    expectToBeType: defineSandboxFn(
      ctx,
      "expectToBeType",
      (
        expectVal: SandboxValue,
        expectedType: SandboxValue,
        isDate: SandboxValue
      ) => {
        const resolved =
          isDate && typeof expectVal === "string"
            ? new Date(expectVal)
            : expectVal
        return createExpect(resolved).toBeType(expectedType)
      }
    ),
    expectToHaveLength: defineSandboxFn(
      ctx,
      "expectToHaveLength",
      (expectVal: SandboxValue, expectedLength: SandboxValue) => {
        return createExpect(expectVal).toHaveLength(expectedLength)
      }
    ),
    expectToInclude: defineSandboxFn(
      ctx,
      "expectToInclude",
      (expectVal: SandboxValue, needle: SandboxValue) => {
        return createExpect(expectVal).toInclude(needle)
      }
    ),

    // Negative expectations
    expectNotToBe: defineSandboxFn(
      ctx,
      "expectNotToBe",
      (expectVal: SandboxValue, expectedVal: SandboxValue) => {
        return createExpect(expectVal).not.toBe(expectedVal)
      }
    ),
    expectNotToBeLevel2xx: defineSandboxFn(
      ctx,
      "expectNotToBeLevel2xx",
      (expectVal: SandboxValue) => {
        return createExpect(expectVal).not.toBeLevel2xx()
      }
    ),
    expectNotToBeLevel3xx: defineSandboxFn(
      ctx,
      "expectNotToBeLevel3xx",
      (expectVal: SandboxValue) => {
        return createExpect(expectVal).not.toBeLevel3xx()
      }
    ),
    expectNotToBeLevel4xx: defineSandboxFn(
      ctx,
      "expectNotToBeLevel4xx",
      (expectVal: SandboxValue) => {
        return createExpect(expectVal).not.toBeLevel4xx()
      }
    ),
    expectNotToBeLevel5xx: defineSandboxFn(
      ctx,
      "expectNotToBeLevel5xx",
      (expectVal: SandboxValue) => {
        return createExpect(expectVal).not.toBeLevel5xx()
      }
    ),
    expectNotToBeType: defineSandboxFn(
      ctx,
      "expectNotToBeType",
      (
        expectVal: SandboxValue,
        expectedType: SandboxValue,
        isDate: SandboxValue
      ) => {
        const resolved =
          isDate && typeof expectVal === "string"
            ? new Date(expectVal)
            : expectVal
        return createExpect(resolved).not.toBeType(expectedType)
      }
    ),
    expectNotToHaveLength: defineSandboxFn(
      ctx,
      "expectNotToHaveLength",
      (expectVal: SandboxValue, expectedLength: SandboxValue) => {
        return createExpect(expectVal).not.toHaveLength(expectedLength)
      }
    ),
    expectNotToInclude: defineSandboxFn(
      ctx,
      "expectNotToInclude",
      (expectVal: SandboxValue, needle: SandboxValue) => {
        return createExpect(expectVal).not.toInclude(needle)
      }
    ),
  }
}
