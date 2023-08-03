import { describe, it, expect } from "vitest"
import { Inspector, InspectionService, InspectorResult } from "../"
import { TestContainer } from "dioc/testing"
import { Ref, ref } from "vue"

const inspectorResultMock: InspectorResult[] = [
  {
    id: "result1",
    text: { type: "text", text: "Sample Text" },
    icon: {},
    isApplicable: true,
    severity: 2,
    componentRefID: "ref-1",
  },
]

const testInspector: Inspector = {
  inspectorID: "inspector1",
  getInspectorFor: () => inspectorResultMock,
}

describe("InspectionService", () => {
  describe("registerInspector", () => {
    it("should register an inspector", () => {
      const container = new TestContainer()
      const service = container.bind(InspectionService)

      service.registerInspector(testInspector)

      const req = {
        endpoint: "http://example.com/api/data",
        headers: {},
        params: {},
      }
      const checks = ["all_validation"]
      const componentRefID: Ref<string> = ref("ref-1")

      const result = service.getInspectorFor(req, checks, componentRefID)

      expect(result).toContainEqual(expect.objectContaining({ id: "result1" }))
    })
  })

  describe("getInspectorFor", () => {
    it("should get the inspection results", () => {
      const sampleResults = inspectorResultMock

      const container = new TestContainer()
      const service = container.bind(InspectionService)

      service.registerInspector(testInspector)

      const req = {
        endpoint: "http://example.com/api/data",
        headers: {},
        params: {},
      }
      const checks = ["all_validation"]
      const componentRefID: Ref<string> = ref("ref-1")

      const results = service.getInspectorFor(req, checks, componentRefID)

      expect(results).toEqual(sampleResults)
    })

    it("should return empty array if no inspectors are registered", () => {
      const container = new TestContainer()
      const service = container.bind(InspectionService)

      const req = {
        endpoint: "http://example.com/api/data",
        headers: {},
        params: {},
      }
      const checks = ["all_validation"]
      const componentRefID: Ref<string> = ref("ref-1")

      const results = service.getInspectorFor(req, checks, componentRefID)

      expect(results).toEqual([])
    })
  })
})
