import { describe, it, expect } from "vitest"
import { Inspector, InspectionService, InspectorResult } from "../"
import { TestContainer } from "dioc/testing"

const inspectorResultMock: InspectorResult[] = [
  {
    id: "result1",
    text: { type: "text", text: "Sample Text" },
    icon: {},
    isApplicable: true,
    severity: 2,
    locations: { type: "url" },
    action: {
      text: "Sample Action",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      apply: () => {},
    },
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

      expect(service.inspectors.has(testInspector.inspectorID)).toBe(true)
    })
  })

  describe("deleteTabInspectorResult", () => {
    it("should delete a tab's inspector results", () => {
      const container = new TestContainer()
      const service = container.bind(InspectionService)

      const tabID = "testTab"
      service.tabs.value.set(tabID, inspectorResultMock)

      expect(service.tabs.value.has(tabID)).toBe(true)

      service.deleteTabInspectorResult(tabID)

      expect(service.tabs.value.has(tabID)).toBe(false)
    })
  })
})
