import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { EnvironmentInspectorService } from "../environment.inspector"
import { InspectionService } from "../../index"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { ref } from "vue"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

vi.mock("~/newstore/environments", async () => {
  const { BehaviorSubject }: any = await vi.importActual("rxjs")

  return {
    __esModule: true,
    aggregateEnvsWithSecrets$: new BehaviorSubject([
      { key: "EXISTING_ENV_VAR", value: "test_value", secret: false },
      { key: "EXISTING_ENV_VAR_2", value: "", secret: false },
    ]),
    getCurrentEnvironment: () => ({
      id: "1",
      name: "some-env",
      v: 1,
      variables: {
        key: "EXISTING_ENV_VAR",
        value: "test_value",
        secret: false,
      },
    }),
    getSelectedEnvironmentType: () => "MY_ENV",
  }
})

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

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "<<UNDEFINED_ENV_VAR>>",
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "environment-not-found-0",
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

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "<<EXISTING_ENV_VAR>>",
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return an inspector result when the headers contain undefined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [
          { key: "<<UNDEFINED_ENV_VAR>>", value: "some-value", active: true },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "environment-not-found-0",
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

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [
          { key: "<<EXISTING_ENV_VAR>>", value: "some-value", active: true },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return an inspector result when the params contain undefined environment variables", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        params: [
          { key: "<<UNDEFINED_ENV_VAR>>", value: "some-value", active: true },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "environment-not-found-0",
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

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [],
        params: [
          { key: "<<EXISTING_ENV_VAR>>", value: "some-value", active: true },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return an inspector result when the URL contains empty value in a environment variable", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "<<EXISTING_ENV_VAR_2>>",
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(1)
    })

    it("should not return an inspector result when the URL contains non empty value in a environment variable", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "<<EXISTING_ENV_VAR>>",
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return an inspector result when the headers contain empty value in a environment variable", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [
          { key: "<<EXISTING_ENV_VAR_2>>", value: "some-value", active: true },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(1)
    })

    it("should not return an inspector result when the headers contain non empty value in a environment variable", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [
          { key: "<<EXISTING_ENV_VAR>>", value: "some-value", active: true },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return an inspector result when the params contain empty value in a environment variable", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [],
        params: [
          { key: "<<EXISTING_ENV_VAR_2>>", value: "some-value", active: true },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(1)
    })

    it("should not return an inspector result when the params contain non empty value in a environment variable", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [],
        params: [
          { key: "<<EXISTING_ENV_VAR>>", value: "some-value", active: true },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })
  })
})
