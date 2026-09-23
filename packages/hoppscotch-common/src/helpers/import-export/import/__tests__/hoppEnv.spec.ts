import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import { hoppEnvImporter } from "../hoppEnv"

const runImport = async (content: unknown) => {
  const result = await hoppEnvImporter([JSON.stringify(content)])()
  if (E.isLeft(result)) throw new Error(`importer failed: ${result.left}`)
  return result.right
}

const validEnvironment = {
  id: "test-env-id",
  v: 1,
  name: "Test Environment",
  variables: [
    { key: "API_URL", value: "https://api.example.com" },
    { key: "TOKEN", value: "abc123" },
  ],
}

describe("hoppEnvImporter", () => {
  it("imports an array of environments", async () => {
    const result = await runImport([validEnvironment])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Test Environment")
  })

  it("imports a single environment object (not wrapped in array)", async () => {
    const result = await runImport(validEnvironment)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Test Environment")
    expect(result[0].variables).toHaveLength(2)
  })

  it("imports multiple environments from an array", async () => {
    const second = { ...validEnvironment, id: "second-id", name: "Staging" }
    const result = await runImport([validEnvironment, second])
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("Test Environment")
    expect(result[1].name).toBe("Staging")
  })

  it("converts variable values to strings", async () => {
    const envWithNumericValue = {
      ...validEnvironment,
      variables: [{ key: "PORT", value: 3000 }],
    }
    const result = await runImport(envWithNumericValue)
    expect(result[0].variables[0].value).toBe("3000")
  })
})
