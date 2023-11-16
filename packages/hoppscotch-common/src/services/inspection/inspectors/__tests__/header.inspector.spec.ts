import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { HeaderInspectorService } from "../header.inspector"
import { InspectionService } from "../../index"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { ref } from "vue"
import { InterceptorService } from "~/services/interceptor.service"

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

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [{ key: "Cookie", value: "some-cookie", active: true }],
      })

      const result = headerInspector.getInspections(req)

      expect(result.value).toContainEqual(
        expect.objectContaining({ id: "header", isApplicable: true })
      )
    })

    it("should return an empty array when headers do not contain cookies", () => {
      const container = new TestContainer()
      const headerInspector = container.bind(HeaderInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [{ key: "Authorization", value: "Bearer abcd", active: true }],
      })

      const result = headerInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return an empty array when headers contain cookies but interceptor supports cookies", () => {
      const container = new TestContainer()

      container.bindMock(InterceptorService, {
        currentInterceptor: ref({ supportsCookies: true }) as any,
      })

      const headerInspector = container.bind(HeaderInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [{ key: "Cookie", value: "some-cookie", active: true }],
      })

      const result = headerInspector.getInspections(req)

      expect(result.value).toHaveLength(0)
    })

    it("should return an inspector result when headers contain cookies and the current interceptor doesn't support cookies", () => {
      const container = new TestContainer()

      container.bindMock(InterceptorService, {
        currentInterceptor: ref({ supportsCookies: false }) as any,
      })

      const headerInspector = container.bind(HeaderInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
        headers: [{ key: "Cookie", value: "some-cookie", active: true }],
      })

      const result = headerInspector.getInspections(req)

      expect(result.value).not.toHaveLength(0)
      expect(result.value).toContainEqual(
        expect.objectContaining({ id: "header", isApplicable: true })
      )
    })
  })
})
