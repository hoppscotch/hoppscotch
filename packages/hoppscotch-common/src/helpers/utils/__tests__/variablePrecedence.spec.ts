import { describe, expect, it } from "vitest"
import { HoppRESTAuth, HoppRESTRequestVariable } from "@hoppscotch/data"
import { getEffectiveVariablesForRequest } from "../environments"
import { getComputedAuthHeaders } from "../EffectiveURL"
import { AggregateEnvironment } from "~/newstore/environments"
import { HoppInheritedProperty } from "../../types/HoppInheritedProperties"

describe("inherited collection auth — variable precedence in preview", () => {
  it("resolves request variable over environment variable with the same key", async () => {
    // Arrange
    const collectionAuth: HoppRESTAuth = {
      authType: "basic",
      authActive: true,
      username: "<<token>>",
      password: "irrelevant",
    }

    const environmentVars: AggregateEnvironment[] = [
      {
        key: "token",
        currentValue: "env-token",
        initialValue: "env-token",
        secret: false,
        sourceEnv: "Test Env",
      },
    ]

    const requestVariables: HoppRESTRequestVariable[] = [
      { key: "token", value: "request-token", active: true },
    ]

    // Act — build the same merged list the preview path now produces
    const resolvedList = getEffectiveVariablesForRequest(
      requestVariables,
      [], // no collection vars in this case
      environmentVars
    )

    const computedHeaders = await getComputedAuthHeaders(
      resolvedList,
      undefined,
      collectionAuth
    )

    // Assert
    const authHeader = computedHeaders.find((h) => h.key === "Authorization")
    const expectedEncoded = btoa("request-token:irrelevant")
    expect(authHeader?.value).toBe(`Basic ${expectedEncoded}`)
    // NOT btoa("env-token:irrelevant") — that would mean the bug regressed
  })

  it("falls back to environment variable when no request variable exists", async () => {
    // Arrange
    const collectionAuth: HoppRESTAuth = {
      authType: "basic",
      authActive: true,
      username: "<<token>>",
      password: "irrelevant",
    }

    const environmentVars: AggregateEnvironment[] = [
      {
        key: "token",
        currentValue: "env-token",
        initialValue: "env-token",
        secret: false,
        sourceEnv: "Test Env",
      },
    ]

    const requestVariables: HoppRESTRequestVariable[] = []

    // Act
    const resolvedList = getEffectiveVariablesForRequest(
      requestVariables,
      [],
      environmentVars
    )

    const computedHeaders = await getComputedAuthHeaders(
      resolvedList,
      undefined,
      collectionAuth
    )

    // Assert
    const authHeader = computedHeaders.find((h) => h.key === "Authorization")
    const expectedEncoded = btoa("env-token:irrelevant")
    expect(authHeader?.value).toBe(`Basic ${expectedEncoded}`)
  })

  it("falls back to collection variable when neither request nor matching env var exists", async () => {
    // Arrange
    const collectionAuth: HoppRESTAuth = {
      authType: "basic",
      authActive: true,
      username: "<<token>>",
      password: "irrelevant",
    }

    const environmentVars: AggregateEnvironment[] = []

    const requestVariables: HoppRESTRequestVariable[] = []

    const inheritedVariables: HoppInheritedProperty["variables"] = [
      {
        parentID: "parent-coll",
        parentName: "Parent Coll",
        inheritedVariables: [
          {
            key: "token",
            currentValue: "coll-token",
            initialValue: "coll-token",
            secret: false,
          },
        ],
      },
    ]

    // Act
    const resolvedList = getEffectiveVariablesForRequest(
      requestVariables,
      inheritedVariables,
      environmentVars
    )

    const computedHeaders = await getComputedAuthHeaders(
      resolvedList,
      undefined,
      collectionAuth
    )

    // Assert
    const authHeader = computedHeaders.find((h) => h.key === "Authorization")
    const expectedEncoded = btoa("coll-token:irrelevant")
    expect(authHeader?.value).toBe(`Basic ${expectedEncoded}`)
  })
})
