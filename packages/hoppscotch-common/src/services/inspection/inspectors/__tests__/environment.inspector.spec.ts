import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { EnvironmentInspectorService } from "../environment.inspector"
import { InspectionService } from "../../index"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { getDefaultGQLRequest } from "@hoppscotch/data"
import { ref } from "vue"
import { CurrentValueService } from "~/services/current-environment-value.service"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

vi.mock("~/newstore/environments", async () => {
  const { BehaviorSubject }: any = await vi.importActual("rxjs")

  return {
    __esModule: true,
    aggregateEnvsWithCurrentValue$: new BehaviorSubject([
      {
        key: "EXISTING_ENV_VAR",
        currentValue: "test_value",
        initialValue: "test_value",
        secret: false,
      },
      {
        key: "EXISTING_ENV_VAR_2",
        currentValue: "",
        initialValue: "",
        secret: false,
      },
    ]),
    getCurrentEnvironment: () => ({
      id: "1",
      name: "some-env",
      v: 1,
      variables: {
        key: "EXISTING_ENV_VAR",
        currentValue: "test_value",
        initialValue: "test_value",
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

  describe("getInspections (REST)", () => {
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
      container.bindMock(CurrentValueService, {
        hasValue: vi.fn((key) => {
          if (key === "EXISTING_ENV_VAR_2") return false
          return true
        }),
      })
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
          {
            key: "<<UNDEFINED_ENV_VAR>>",
            value: "some-value",
            active: true,
            description: "",
          },
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
      container.bindMock(CurrentValueService, {
        hasValue: vi.fn((key) => {
          if (key === "EXISTING_ENV_VAR_2") return false
          return true
        }),
      })
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [
          {
            key: "<<EXISTING_ENV_VAR>>",
            value: "some-value",
            active: true,
            description: "",
          },
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
          {
            key: "<<UNDEFINED_ENV_VAR>>",
            value: "some-value",
            active: true,
            description: "",
          },
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
      container.bindMock(CurrentValueService, {
        hasValue: vi.fn((key) => {
          if (key === "EXISTING_ENV_VAR") return false
          return true
        }),
      })
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [],
        params: [
          {
            key: "<<EXISTING_ENV_VAR>>",
            value: "some-value",
            active: true,
            description: "",
          },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return an inspector result when the URL contains empty value in a environment variable", () => {
      const container = new TestContainer()
      container.bindMock(CurrentValueService, {
        hasValue: vi.fn((key) => {
          if (key === "EXISTING_ENV_VAR_2") return true
          return false
        }),
      })
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
      container.bindMock(CurrentValueService, {
        hasValue: vi.fn((key) => {
          if (key === "EXISTING_ENV_VAR") return false
          return true
        }),
      })
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
          {
            key: "<<EXISTING_ENV_VAR_2>>",
            value: "some-value",
            active: true,
            description: "",
          },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(1)
    })

    it("should not return an inspector result when the headers contain non empty value in a environment variable", () => {
      const container = new TestContainer()
      container.bindMock(CurrentValueService, {
        hasValue: vi.fn((key) => {
          if (key === "EXISTING_ENV_VAR") return false
          return true
        }),
      })
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [
          {
            key: "<<EXISTING_ENV_VAR>>",
            value: "some-value",
            active: true,
            description: "",
          },
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
          {
            key: "<<EXISTING_ENV_VAR_2>>",
            value: "some-value",
            active: true,
            description: "",
          },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(1)
    })

    it("should not return an inspector result when the params contain non empty value in a environment variable", () => {
      const container = new TestContainer()
      container.bindMock(CurrentValueService, {
        hasValue: vi.fn((key) => {
          if (key === "EXISTING_ENV_VAR") return false
          return true
        }),
      })
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [],
        params: [
          {
            key: "<<EXISTING_ENV_VAR>>",
            value: "some-value",
            active: true,
            description: "",
          },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })
  })

  describe("getInspections (GQL)", () => {
    it("should return a result when the GQL URL contains an undefined environment variable", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultGQLRequest(),
        url: "<<UNDEFINED_ENV_VAR>>",
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "environment-not-found-0",
          isApplicable: true,
          locations: expect.objectContaining({ type: "url" }),
        })
      )
    })

    it("should not return a result when the GQL URL contains a defined environment variable", () => {
      const container = new TestContainer()
      container.bindMock(CurrentValueService, {
        hasValue: vi.fn(() => true),
      })
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultGQLRequest(),
        url: "<<EXISTING_ENV_VAR>>",
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return a result when a GQL header key contains an undefined environment variable", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultGQLRequest(),
        url: "https://example.com/graphql",
        headers: [{ key: "<<UNDEFINED_ENV_VAR>>", value: "val", active: true }],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "environment-not-found-0",
          isApplicable: true,
          locations: expect.objectContaining({
            type: "header",
            position: "key",
          }),
        })
      )
    })

    it("should return a result when a GQL header value contains an undefined environment variable", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultGQLRequest(),
        url: "https://example.com/graphql",
        headers: [
          {
            key: "Authorization",
            value: "<<UNDEFINED_ENV_VAR>>",
            active: true,
          },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "environment-not-found-0",
          isApplicable: true,
          locations: expect.objectContaining({
            type: "header",
            position: "value",
          }),
        })
      )
    })

    it("should not inspect inactive GQL headers", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultGQLRequest(),
        url: "https://example.com/graphql",
        headers: [
          { key: "<<UNDEFINED_ENV_VAR>>", value: "val", active: false },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return a result when a GQL header key has an empty environment variable value", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultGQLRequest(),
        url: "https://example.com/graphql",
        headers: [
          { key: "<<EXISTING_ENV_VAR_2>>", value: "val", active: true },
        ],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "environment-empty-0",
          isApplicable: true,
          locations: expect.objectContaining({ type: "header" }),
        })
      )
    })

    it("should return empty results for a clean GQL request with no env vars", () => {
      const container = new TestContainer()
      const envInspector = container.bind(EnvironmentInspectorService)

      const req = ref({
        ...getDefaultGQLRequest(),
        url: "https://example.com/graphql",
        headers: [],
      })

      const result = envInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })
  })
})
