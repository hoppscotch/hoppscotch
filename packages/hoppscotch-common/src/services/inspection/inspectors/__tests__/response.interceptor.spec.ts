import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { ResponseInspectorService } from "../response.inspector"
import { InspectionService } from "../../index"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { ref } from "vue"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

describe("ResponseInspectorService", () => {
  it("registers with the inspection service upon initialization", () => {
    const container = new TestContainer()

    const registerInspectorFn = vi.fn()

    container.bindMock(InspectionService, {
      registerInspector: registerInspectorFn,
    })

    const responseInspector = container.bind(ResponseInspectorService)

    expect(registerInspectorFn).toHaveBeenCalledOnce()
    expect(registerInspectorFn).toHaveBeenCalledWith(responseInspector)
  })

  describe("getInspectorFor", () => {
    it("should return an empty array when response is undefined", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      })

      const result = responseInspector.getInspections(req, ref(undefined))

      expect(result.value).toHaveLength(0)
    })

    it("should return an inspector result when response type is not success or status code is not 200", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      })
      const res = ref<HoppRESTResponse>({
        type: "network_fail",
        error: new Error("test"),
        req: req.value,
      })

      const result = responseInspector.getInspections(req, res)

      expect(result.value).toContainEqual(
        expect.objectContaining({ id: "url", isApplicable: true })
      )
    })

    it("should handle network_fail responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      })
      const res = ref<HoppRESTResponse>({
        type: "network_fail",
        error: new Error("test"),
        req: req.value,
      })

      const result = responseInspector.getInspections(req, res)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          text: { type: "text", text: "inspections.response.network_error" },
        })
      )
    })

    it("should handle fail responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      })
      const res = ref<HoppRESTResponse>({
        type: "fail",
        statusCode: 500,
        body: Uint8Array.from([]),
        headers: [],
        meta: { responseDuration: 0, responseSize: 0 },
        req: req.value,
      })

      const result = responseInspector.getInspections(req, res)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          text: { type: "text", text: "inspections.response.default_error" },
        })
      )
    })

    it("should handle 404 responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      })
      const res = ref<HoppRESTResponse>({
        type: "success",
        statusCode: 404,
        body: Uint8Array.from([]),
        headers: [],
        meta: { responseDuration: 0, responseSize: 0 },
        req: req.value,
      })

      const result = responseInspector.getInspections(req, res)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          text: { type: "text", text: "inspections.response.404_error" },
        })
      )
    })

    it("should handle 401 responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      })
      const res = ref<HoppRESTResponse>({
        type: "success",
        statusCode: 401,
        body: Uint8Array.from([]),
        headers: [],
        meta: { responseDuration: 0, responseSize: 0 },
        req: req.value,
      })

      const result = responseInspector.getInspections(req, res)

      expect(result.value).toContainEqual(
        expect.objectContaining({
          text: { type: "text", text: "inspections.response.401_error" },
        })
      )
    })

    it("should handle successful responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      })
      const res = ref<HoppRESTResponse>({
        type: "success",
        statusCode: 200,
        body: Uint8Array.from([]),
        headers: [],
        meta: { responseDuration: 0, responseSize: 0 },
        req: req.value,
      })

      const result = responseInspector.getInspections(req, res)

      expect(result.value).toHaveLength(0)
    })
  })
})
