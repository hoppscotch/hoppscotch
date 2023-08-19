import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { URLInspectorService } from "../url.inspector"
import { InspectionService } from "../../index"
import { getDefaultRESTRequest } from "~/helpers/rest/default"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

describe("URLInspectorService", () => {
  it("registers with the inspection service upon initialization", () => {
    const container = new TestContainer()

    const registerInspectorFn = vi.fn()

    container.bindMock(InspectionService, {
      registerInspector: registerInspectorFn,
    })

    const urlInspector = container.bind(URLInspectorService)

    expect(registerInspectorFn).toHaveBeenCalledOnce()
    expect(registerInspectorFn).toHaveBeenCalledWith(urlInspector)
  })

  describe("getInspectorFor", () => {
    it("should return an inspector result when localhost is in URL and extension is not available", () => {
      const container = new TestContainer()
      const urlInspector = container.bind(URLInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://localhost:8000/api/data",
      }

      const result = urlInspector.getInspectorFor(req)

      expect(result).toContainEqual(
        expect.objectContaining({ id: "url", isApplicable: true })
      )
    })

    it("should not return an inspector result when localhost is not in URL", () => {
      const container = new TestContainer()
      const urlInspector = container.bind(URLInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://example.com/api/data",
      }

      const result = urlInspector.getInspectorFor(req)

      expect(result).toHaveLength(0)
    })

    it("should add the correct text to the results when extension is not installed", () => {
      vi.mock("~/newstore/HoppExtension", async () => {
        const { BehaviorSubject }: any = await vi.importActual("rxjs")

        return {
          __esModule: true,
          extensionStatus$: new BehaviorSubject("waiting"),
        }
      })
      const container = new TestContainer()
      const urlInspector = container.bind(URLInspectorService)

      const req = {
        ...getDefaultRESTRequest(),
        endpoint: "http://localhost:8000/api/data",
      }

      const result = urlInspector.getInspectorFor(req)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        text: { type: "text", text: "inspections.url.extension_not_installed" },
      })
    })
  })
})
