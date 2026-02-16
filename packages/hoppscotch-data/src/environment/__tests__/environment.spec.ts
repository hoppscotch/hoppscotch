import { describe, expect, test } from "vitest"
import * as E from "fp-ts/Either"
import {
  parseBodyEnvVariablesE,
  parseBodyEnvVariables,
  parseTemplateStringE,
  parseTemplateString,
  translateToNewEnvironmentVariables,
  translateToNewEnvironment,
  EnvironmentSchemaVersion,
} from "../index"

const makeVar = (
  key: string,
  currentValue: string,
  secret = false
): {
  key: string
  initialValue: string
  currentValue: string
  secret: boolean
} => ({
  key,
  initialValue: currentValue,
  currentValue,
  secret,
})

describe("Environment utilities", () => {
  describe("parseBodyEnvVariablesE", () => {
    test("replaces a single variable", () => {
      const vars = [makeVar("host", "example.com")]
      const result = parseBodyEnvVariablesE("https://<<host>>/api", vars)
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("https://example.com/api")
      }
    })

    test("replaces multiple variables", () => {
      const vars = [makeVar("host", "example.com"), makeVar("port", "8080")]
      const result = parseBodyEnvVariablesE("<<host>>:<<port>>", vars)
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("example.com:8080")
      }
    })

    test("handles recursive variable expansion", () => {
      const vars = [
        makeVar("baseUrl", "<<host>>/api"),
        makeVar("host", "example.com"),
      ]
      const result = parseBodyEnvVariablesE("<<baseUrl>>/v1", vars)
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("example.com/api/v1")
      }
    })

    test("returns Left for infinite recursive loops", () => {
      const vars = [makeVar("a", "<<b>>"), makeVar("b", "<<a>>")]
      const result = parseBodyEnvVariablesE("<<a>>", vars)
      expect(E.isLeft(result)).toBe(true)
    })

    test("leaves unmatched variables as-is but detects as loop when they persist", () => {
      // When a variable like <<missing>> is never resolved, it stays in the string
      // and the regex keeps matching, eventually hitting the expansion limit
      const vars = [makeVar("host", "example.com")]
      const result = parseBodyEnvVariablesE("<<host>>-<<missing>>", vars)
      // The unresolved <<missing>> causes the loop detector to trigger
      expect(E.isLeft(result)).toBe(true)
    })

    test("handles empty body string", () => {
      const result = parseBodyEnvVariablesE("", [makeVar("x", "y")])
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("")
      }
    })

    test("handles body with no variables", () => {
      const result = parseBodyEnvVariablesE("plain text", [
        makeVar("x", "y"),
      ])
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("plain text")
      }
    })
  })

  describe("parseBodyEnvVariables (deprecated)", () => {
    test("returns expanded string on success", () => {
      const vars = [makeVar("name", "world")]
      expect(parseBodyEnvVariables("hello <<name>>", vars)).toBe(
        "hello world"
      )
    })

    test("returns original body on loop detection", () => {
      const vars = [makeVar("a", "<<b>>"), makeVar("b", "<<a>>")]
      // Falls back to original body on error
      expect(parseBodyEnvVariables("<<a>>", vars)).toBe("<<a>>")
    })
  })

  describe("parseTemplateStringE", () => {
    test("replaces variables in template string", () => {
      const vars = [makeVar("token", "abc123")]
      const result = parseTemplateStringE("Bearer <<token>>", vars)
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("Bearer abc123")
      }
    })

    test("returns empty string for unmatched variables", () => {
      const vars = [makeVar("other", "val")]
      const result = parseTemplateStringE("<<missing>>", vars)
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("")
      }
    })

    test("handles null/empty variables array gracefully", () => {
      const result = parseTemplateStringE("test <<var>>", [])
      expect(E.isRight(result)).toBe(true)
    })

    test("handles null str gracefully", () => {
      const result = parseTemplateStringE("", [makeVar("x", "y")])
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("")
      }
    })

    test("masks secret variable values when maskValue is true", () => {
      const vars = [makeVar("secret_key", "mysecret", true)]
      const result = parseTemplateStringE("key=<<secret_key>>", vars, true)
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("key=********")
        expect(result.right).not.toContain("mysecret")
      }
    })

    test("shows key placeholder for secret when showKeyIfSecret is true", () => {
      const vars = [makeVar("api_key", "hidden_val", true)]
      const result = parseTemplateStringE(
        "<<api_key>>",
        vars,
        false,
        true
      )
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.right).toBe("<<api_key>>")
      }
    })

    test("detects infinite expansion loops", () => {
      const vars = [makeVar("x", "<<y>>"), makeVar("y", "<<x>>")]
      const result = parseTemplateStringE("<<x>>", vars)
      expect(E.isLeft(result)).toBe(true)
    })
  })

  describe("parseTemplateString (deprecated)", () => {
    test("returns expanded string", () => {
      const vars = [makeVar("greeting", "Hello")]
      expect(parseTemplateString("<<greeting>> World", vars)).toBe(
        "Hello World"
      )
    })
  })

  describe("translateToNewEnvironmentVariables", () => {
    test("translates a variable with currentValue and initialValue", () => {
      const result = translateToNewEnvironmentVariables({
        key: "host",
        initialValue: "init",
        currentValue: "current",
      })
      expect(result).toEqual({
        key: "host",
        initialValue: "init",
        currentValue: "current",
        secret: false,
      })
    })

    test("falls back to value field for legacy format", () => {
      const result = translateToNewEnvironmentVariables({
        key: "host",
        value: "legacy",
      })
      expect(result).toEqual({
        key: "host",
        initialValue: "legacy",
        currentValue: "legacy",
        secret: false,
      })
    })

    test("falls back to empty string when no value fields exist", () => {
      const result = translateToNewEnvironmentVariables({ key: "empty" })
      expect(result).toEqual({
        key: "empty",
        initialValue: "",
        currentValue: "",
        secret: false,
      })
    })

    test("preserves secret flag when present", () => {
      const result = translateToNewEnvironmentVariables({
        key: "token",
        initialValue: "init",
        currentValue: "curr",
        secret: true,
      })
      expect(result.secret).toBe(true)
    })
  })

  describe("translateToNewEnvironment", () => {
    test("returns environment as-is if already at current schema version", () => {
      const env = {
        v: EnvironmentSchemaVersion,
        id: "test-id",
        name: "Test",
        variables: [],
      }
      expect(translateToNewEnvironment(env)).toBe(env)
    })

    test("migrates legacy environment without version", () => {
      const legacy = {
        name: "Legacy",
        variables: [{ key: "host", value: "example.com" }],
      }
      const result = translateToNewEnvironment(legacy)
      expect(result.v).toBe(EnvironmentSchemaVersion)
      expect(result.name).toBe("Legacy")
      expect(result.variables).toEqual([
        {
          key: "host",
          initialValue: "example.com",
          currentValue: "example.com",
          secret: false,
        },
      ])
      expect(result.id).toBeTruthy()
    })

    test("handles missing name with default", () => {
      const result = translateToNewEnvironment({ variables: [] })
      expect(result.name).toBe("Untitled")
    })

    test("handles missing variables with empty array", () => {
      const result = translateToNewEnvironment({ name: "Empty" })
      expect(result.variables).toEqual([])
    })

    test("preserves existing id", () => {
      const result = translateToNewEnvironment({
        id: "my-id",
        name: "Test",
        variables: [],
      })
      expect(result.id).toBe("my-id")
    })
  })
})
