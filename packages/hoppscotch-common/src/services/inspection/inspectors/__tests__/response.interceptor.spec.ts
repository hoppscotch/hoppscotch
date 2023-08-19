import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { ResponseInspectorService } from "../response.inspector"
import { InspectionService } from "../../index"
import { getDefaultRESTRequest } from "~/helpers/rest/default"

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

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      }

      const result = responseInspector.getInspectorFor(req, undefined)

      expect(result).toHaveLength(0)
    })

    it("should return an inspector result when response type is not success or status code is not 200", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      }
      const res = { type: "network_fail", statusCode: 400 }

      const result = responseInspector.getInspectorFor(req, res)

      expect(result).toContainEqual(
        expect.objectContaining({ id: "url", isApplicable: true })
      )
    })

    it("should handle network_fail responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      }
      const res = { type: "network_fail", statusCode: 500 }

      const result = responseInspector.getInspectorFor(req, res)

      expect(result).toContainEqual(
        expect.objectContaining({
          text: { type: "text", text: "inspections.response.network_error" },
        })
      )
    })

    it("should handle fail responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      }
      const res = { type: "fail", statusCode: 500 }

      const result = responseInspector.getInspectorFor(req, res)

      expect(result).toContainEqual(
        expect.objectContaining({
          text: { type: "text", text: "inspections.response.default_error" },
        })
      )
    })

    it("should handle 404 responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      }
      const res = { type: "success", statusCode: 404 }

      const result = responseInspector.getInspectorFor(req, res)

      expect(result).toContainEqual(
        expect.objectContaining({
          text: { type: "text", text: "inspections.response.404_error" },
        })
      )
    })

    it("should handle 401 responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      }
      const res = { type: "success", statusCode: 401 }

      const result = responseInspector.getInspectorFor(req, res)

      expect(result).toContainEqual(
        expect.objectContaining({
          text: { type: "text", text: "inspections.response.401_error" },
        })
      )
    })

    it("should handle successful responses", () => {
      const container = new TestContainer()
      const responseInspector = container.bind(ResponseInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      }
      const res = { type: "success", statusCode: 200 }

      const result = responseInspector.getInspectorFor(req, res)

      expect(result).toHaveLength(0)
    })
  })
})
