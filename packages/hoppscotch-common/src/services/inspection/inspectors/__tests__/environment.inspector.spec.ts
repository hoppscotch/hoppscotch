import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { EnvironmentInspectorService } from "../environment.inspector"
import { InspectionService } from "../../index"
import { getDefaultRESTRequest } from "~/helpers/rest/default"

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

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "<<UNDEFINED_ENV_VAR>>",
      }

      const result = envInspector.getInspectorFor(req)

      expect(result).toContainEqual(
        expect.objectContaining({
          id: "environment",
          isApplicable: true,
          text: {
            type: "text",
            text: "inspections.environment.not_found",
          },
        })
      )
    })

    it("should not return an inspector result when the URL contains defined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "<<EXISTING_ENV_VAR>>",
      }

      const result = envInspector.getInspectorFor(req)

      expect(result).toHaveLength(0)
    })

    it("should return an inspector result when the headers contain undefined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [
          { key: "<<UNDEFINED_ENV_VAR>>", value: "some-value", active: true },
        ],
      }

      const result = envInspector.getInspectorFor(req)

      expect(result).toContainEqual(
        expect.objectContaining({
          id: "environment",
          isApplicable: true,
          text: {
            type: "text",
            text: "inspections.environment.not_found",
          },
        })
      )
    })

    it("should not return an inspector result when the headers contain defined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [
          { key: "<<EXISTING_ENV_VAR>>", value: "some-value", active: true },
        ],
      }

      const result = envInspector.getInspectorFor(req)

      expect(result).toHaveLength(0)
    })

    it("should return an inspector result when the params contain undefined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        params: [
          { key: "<<UNDEFINED_ENV_VAR>>", value: "some-value", active: true },
        ],
      }

      const result = envInspector.getInspectorFor(req)

      expect(result).toContainEqual(
        expect.objectContaining({
          id: "environment",
          isApplicable: true,
          text: {
            type: "text",
            text: "inspections.environment.not_found",
          },
        })
      )
    })

    it("should not return an inspector result when the params contain defined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [],
        params: [
          { key: "<<EXISTING_ENV_VAR>>", value: "some-value", active: true },
        ],
      }

      const result = envInspector.getInspectorFor(req)

      expect(result).toHaveLength(0)
    })
  })
})
