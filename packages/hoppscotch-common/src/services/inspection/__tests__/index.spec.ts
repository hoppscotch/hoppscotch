import { describe, it, expect, vi } from "vitest"
import { Inspector, InspectionService, InspectorResult } from "../"
import { TestContainer } from "dioc/testing"
import { computed, ref } from "vue"
import { refWithControl } from "@vueuse/core"
import { RESTTabService } from "~/services/tab/rest"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

const inspectorResultMock: InspectorResult[] = [
  {
    id: "result1",
    text: { type: "text", text: "Sample Text" },
    icon: {},
    isApplicable: true,
    severity: 2,
    locations: { type: "url" },
    doc: { text: "Sample Doc", link: "https://example.com" },
    action: {
      text: "Sample Action",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      apply: () => {},
    },
  },
]

const testInspector: Inspector = {
  inspectorID: "inspector1",
  getInspections: () => ref(inspectorResultMock),
}

const mockRESTTab = {
  id: "test",
  document: {
    type: "request" as const,
    request: {},
    response: null,
    isDirty: false,
    optionTabPreference: "params" as const,
  },
}

describe("InspectionService", () => {
  describe("registerInspector", () => {
    it("should register a REST inspector", () => {
      const container = new TestContainer()

      container.bindMock(RESTTabService, {
        currentActiveTab: computed(() => mockRESTTab),
        tabMap: new Map([["test", mockRESTTab]]),
        tabOrdering: ref(["test"]),
        currentTabID: refWithControl("test"),
      })

      const service = container.bind(InspectionService)

      service.registerInspector(testInspector)

      expect(service.inspectors.has(testInspector.inspectorID)).toEqual(true)
    })
  })

  describe("deleteTabInspectorResult", () => {
    it("should delete a tab's inspector results", () => {
      const container = new TestContainer()

      container.bindMock(RESTTabService, {
        currentActiveTab: computed(() => mockRESTTab),
        tabMap: new Map([["test", mockRESTTab]]),
        tabOrdering: ref(["test"]),
        currentTabID: refWithControl("test"),
      })

      const service = container.bind(InspectionService)

      const tabID = "testTab"
      service.tabs.value.set(tabID, inspectorResultMock)

      expect(service.tabs.value.has(tabID)).toEqual(true)

      service.deleteTabInspectorResult(tabID)

      expect(service.tabs.value.has(tabID)).toEqual(false)
    })
  })
})
