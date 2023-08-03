import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { EnvironmentInspectorService } from "../environment.inspector"
import { InspectionService } from "../../index"
import { ref } from "vue"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

vi.mock("~/newstore/environments", () => ({
  __esModule: true,
  getAggregateEnvs: () => [{ key: "EXISTING_ENV_VAR", value: "test_value" }],
}))

describe("EnvironmentInspectorService", () => {
  it("registers with the inspection service upon initialization", () => {
    const container = new TestContainer()

    const registerInspectorFn = vi.fn()

    container.bindMock(InspectionService, {
      registerInspector: registerInspectorFn,
    })

    const envInspector = container.bind(EnvironmentInspectorService)

    expect(registerInspectorFn).toHaveBeenCalledOnce()
    expect(registerInspectorFn).toHaveBeenCalledWith(envInspector)
  })

  describe("getInspectorFor", () => {
    it("should return an inspector result when the URL contains undefined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = { endpoint: "<<UNDEFINED_ENV_VAR>>", headers: {}, params: {} }
      const checks = ["url_environment_validation", "all_validation"]
      const componentRefID = ref("ref-1")

      const result = envInspector.getInspectorFor(req, checks, componentRefID)

      expect(result).toContainEqual(
        expect.objectContaining({
          id: "environment",
          isApplicable: true,
          text: {
            type: "text",
            text: "Environment variable <<UNDEFINED_ENV_VAR>> not found",
          },
        })
      )
    })

    it("should not return an inspector result when the URL contains defined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = { endpoint: "<<EXISTING_ENV_VAR>>", headers: {}, params: {} }
      const checks = ["url_environment_validation", "all_validation"]
      const componentRefID = { value: "some-id" }

      const result = envInspector.getInspectorFor(req, checks, componentRefID)

      expect(result).toHaveLength(0)
    })

    it("should return an inspector result when the headers contain undefined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = {
        endpoint: "http://example.com/api/data",
        headers: [{ key: "<<UNDEFINED_ENV_VAR>>", value: "some-value" }],
        params: {},
      }
      const checks = ["header_environment_validation", "all_validation"]
      const componentRefID = ref("ref-1")

      const result = envInspector.getInspectorFor(req, checks, componentRefID)

      expect(result).toContainEqual(
        expect.objectContaining({
          id: "environment",
          isApplicable: true,
          text: {
            type: "text",
            text: "Environment variable <<UNDEFINED_ENV_VAR>> not found",
          },
        })
      )
    })

    it("should not return an inspector result when the headers contain defined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = {
        endpoint: "http://example.com/api/data",
        headers: [{ key: "<<EXISTING_ENV_VAR>>", value: "some-value" }],
        params: {},
      }
      const checks = ["header_environment_validation", "all_validation"]
      const componentRefID = ref("ref-1")

      const result = envInspector.getInspectorFor(req, checks, componentRefID)

      expect(result).toHaveLength(0)
    })

    it("should return an inspector result when the params contain undefined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = {
        endpoint: "http://example.com/api/data",
        headers: [],
        params: [{ key: "<<UNDEFINED_ENV_VAR>>", value: "some-value" }],
      }
      const checks = ["param_environment_validation", "all_validation"]
      const componentRefID = ref("ref-1")

      const result = envInspector.getInspectorFor(req, checks, componentRefID)

      expect(result).toContainEqual(
        expect.objectContaining({
          id: "environment",
          isApplicable: true,
          text: {
            type: "text",
            text: "Environment variable <<UNDEFINED_ENV_VAR>> not found",
          },
        })
      )
    })

    it("should not return an inspector result when the params contain defined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = {
        endpoint: "http://example.com/api/data",
        headers: [],
        params: [{ key: "<<EXISTING_ENV_VAR>>", value: "some-value" }],
      }
      const checks = ["param_environment_validation", "all_validation"]
      const componentRefID = ref("ref-1")

      const result = envInspector.getInspectorFor(req, checks, componentRefID)

      expect(result).toHaveLength(0)
    })
  })
})
