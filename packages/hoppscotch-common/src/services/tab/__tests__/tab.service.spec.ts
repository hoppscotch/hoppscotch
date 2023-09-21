import { describe, expect, it } from "vitest"
import { TestContainer } from "dioc/testing"
import { TabService } from "../tab"
import { reactive } from "vue"

class MockTabService extends TabService<{ request: string }> {
  public static readonly ID = "MOCK_TAB_SERVICE"

  constructor() {
    super()

    this.tabMap = reactive(
      new Map([
        [
          "test",
          {
            id: "test",
            document: {
              request: "test request",
            },
          },
        ],
      ])
    )

    this.watchCurrentTabID()
  }
}

describe("TabService", () => {
  it("initially only one tab is defined", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    expect(service.getActiveTabs().value.length).toEqual(1)
  })

  it("initially the only tab is the active tab", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    expect(service.getActiveTab()).not.toBeNull()
  })

  it("initially active tab id is test", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    expect(service.getActiveTab()?.id).toEqual("test")
  })

  it("add new tab", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    service.createNewTab({
      request: "new request",
    })

    expect(service.getActiveTabs().value.length).toEqual(2)
  })

  it("get active tab", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    console.log(service.getActiveTab())

    expect(service.getActiveTab()?.id).toEqual("test")
  })

  it("sort tabs", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    const currentOrder = service.updateTabOrdering(1, 0)

    expect(currentOrder[1]).toEqual("test")
  })

  it("update tab", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    service.updateTab({
      id: service.currentTabID.value,
      document: {
        request: "updated request",
      },
    })

    expect(service.getActiveTab()?.document.request).toEqual("updated request")
  })

  it("set new active tab", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    service.setActiveTab("test")

    expect(service.getActiveTab()?.id).toEqual("test")
  })

  it("close other tabs", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    service.closeOtherTabs("test")

    expect(service.getActiveTabs().value.length).toEqual(1)
  })

  it("close tab", () => {
    const container = new TestContainer()

    const service = container.bind(MockTabService)

    service.createNewTab({
      request: "new request",
    })

    expect(service.getActiveTabs().value.length).toEqual(2)

    service.closeTab("test")

    expect(service.getActiveTabs().value.length).toEqual(1)
  })
})
