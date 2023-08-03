import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { HeaderInspectorService } from "../header.inspector"
import { InspectionService } from "../../index"
import { ref } from "vue"

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
        endpoint: "http://example.com/api/data",
        headers: [{ key: "Cookie", value: "some-cookie" }],
      }
      const checks = ["header_validation"]
      const componentRefID = ref("ref-1")

      const result = headerInspector.getInspectorFor(
        req,
        checks,
        componentRefID
      )

      console.log("result", result)

      expect(result).toContainEqual(
        expect.objectContaining({ id: "header", isApplicable: true })
      )
    })

    it("should return an empty array when headers do not contain cookies", () => {
      const container = new TestContainer()
      const headerInspector = container.bind(HeaderInspectorService)

      const req = {
        endpoint: "http://example.com/api/data",
        headers: [{ key: "Authorization", value: "Bearer abcd" }],
      }
      const checks = ["header_validation"]
      const componentRefID = ref("ref-1")

      const result = headerInspector.getInspectorFor(
        req,
        checks,
        componentRefID
      )

      expect(result).toHaveLength(0)
    })
  })
})
