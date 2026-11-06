import { describe, test, expect } from "vitest"
import {
  validateWorkspaceName,
  sanitizeWorkspaceName,
} from "../validateWorkspaceName"

describe("validateWorkspaceName", () => {
  test("rejects empty string", () => {
    const result = validateWorkspaceName("")
    expect(result.ok).toBe(false)
    expect(result.message).toBe("Workspace name cannot be empty.")
  })

  test("rejects whitespace-only string", () => {
    const result = validateWorkspaceName("    \t   ")
    expect(result.ok).toBe(false)
    expect(result.message).toBe("Workspace name cannot be empty.")
  })

  test("rejects trimmed length below 6", () => {
    const result = validateWorkspaceName("  team ")
    expect(result.ok).toBe(false)
    expect(result.message).toBe(
      "Workspace name must be at least 6 characters long."
    )
  })

  test("accepts exactly 6 characters after trim", () => {
    const result = validateWorkspaceName("  team12  ")
    expect(result.ok).toBe(true)
    expect(result.message).toBeUndefined()
  })

  test("accepts longer names", () => {
    const result = validateWorkspaceName("my-awesome-team")
    expect(result.ok).toBe(true)
    expect(result.message).toBeUndefined()
  })
})

describe("sanitizeWorkspaceName", () => {
  test("trims leading and trailing whitespace", () => {
    expect(sanitizeWorkspaceName("   hello  ")).toBe("hello")
  })

  test("returns empty string when only whitespace is provided", () => {
    expect(sanitizeWorkspaceName("   \n  \t ")).toBe("")
  })
})
