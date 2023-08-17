import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { HeaderInspectorService } from "../header.inspector"
import { InspectionService } from "../../index"
import { getDefaultRESTRequest } from "~/helpers/rest/default"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

describe("HeaderInspectorService", () => {
  it("registers with the inspection service upon initialization", () => {
    const container = new TestContainer()

    const registerInspectorFn = vi.fn()

    container.bindMock(InspectionService, {
      registerInspector: registerInspectorFn,
    })

    const headerInspector = container.bind(HeaderInspectorService)

    expect(registerInspectorFn).toHaveBeenCalledOnce()
    expect(registerInspectorFn).toHaveBeenCalledWith(headerInspector)
  })

  describe("getInspectorFor", () => {
    it("should return an inspector result when headers contain cookies", () => {
      const container = new TestContainer()
      const headerInspector = container.bind(HeaderInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [{ key: "Cookie", value: "some-cookie", active: true }],
      }

      const result = headerInspector.getInspectorFor(req)

      expect(result).toContainEqual(
        expect.objectContaining({ id: "header", isApplicable: true })
      )
    })

    it("should return an empty array when headers do not contain cookies", () => {
      const container = new TestContainer()
      const headerInspector = container.bind(HeaderInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [{ key: "Authorization", value: "Bearer abcd", active: true }],
      }

      const result = headerInspector.getInspectorFor(req)

      expect(result).toHaveLength(0)
    })
  })
})
