import { describe, expect, it } from "vitest"
import { TestContainer } from "dioc/testing"
import { TabService } from "../tab"
import { reactive } from "vue"

class MockTabService extends TabService<{ request: string }> {
  public static readonly ID = "MOCK_TAB_SERVICE"

  override onServiceInit() {
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

  describe("Tab Navigation", () => {
    it("should navigate to next tab", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      const tab2 = service.createNewTab({ request: "second request" })
      const tab3 = service.createNewTab({ request: "third request" })

      service.setActiveTab("test")
      expect(service.getActiveTab()?.id).toEqual("test")

      service.goToNextTab()
      expect(service.getActiveTab()?.id).toEqual(tab2.id)

      service.goToNextTab()
      expect(service.getActiveTab()?.id).toEqual(tab3.id)

      service.goToNextTab()
      expect(service.getActiveTab()?.id).toEqual("test")
    })

    it("should navigate to previous tab", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      const tab2 = service.createNewTab({ request: "second request" })
      const tab3 = service.createNewTab({ request: "third request" })

      service.setActiveTab(tab3.id)
      expect(service.getActiveTab()?.id).toEqual(tab3.id)

      service.goToPreviousTab()
      expect(service.getActiveTab()?.id).toEqual(tab2.id)

      service.goToPreviousTab()
      expect(service.getActiveTab()?.id).toEqual("test")

      service.goToPreviousTab()
      expect(service.getActiveTab()?.id).toEqual(tab3.id)
    })

    it("should navigate to first tab", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      // Unused variable that improves readability.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const tab2 = service.createNewTab({ request: "second request" })
      const tab3 = service.createNewTab({ request: "third request" })

      service.setActiveTab(tab3.id)
      expect(service.getActiveTab()?.id).toEqual(tab3.id)

      service.goToFirstTab()
      expect(service.getActiveTab()?.id).toEqual("test")
    })

    it("should navigate to last tab", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      // Unused variable that improves readability.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const tab2 = service.createNewTab({ request: "second request" })
      const tab3 = service.createNewTab({ request: "third request" })

      service.setActiveTab("test")
      expect(service.getActiveTab()?.id).toEqual("test")

      service.goToLastTab()
      expect(service.getActiveTab()?.id).toEqual(tab3.id)
    })

    it("should navigate to tab by index", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      const tab2 = service.createNewTab({ request: "second request" })
      const tab3 = service.createNewTab({ request: "third request" })

      service.goToTabByIndex(1)
      expect(service.getActiveTab()?.id).toEqual("test")

      service.goToTabByIndex(2)
      expect(service.getActiveTab()?.id).toEqual(tab2.id)

      service.goToTabByIndex(3)
      expect(service.getActiveTab()?.id).toEqual(tab3.id)
    })

    it("should handle invalid tab index gracefully", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      const originalActiveTab = service.getActiveTab()

      service.goToTabByIndex(0) // Invalid (0-based)
      expect(service.getActiveTab()?.id).toEqual(originalActiveTab?.id)

      service.goToTabByIndex(5) // Invalid (out of range)
      expect(service.getActiveTab()?.id).toEqual(originalActiveTab?.id)

      service.goToTabByIndex(-1) // Invalid (negative)
      expect(service.getActiveTab()?.id).toEqual(originalActiveTab?.id)
    })

    it("should handle navigation with single tab", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      const originalActiveTab = service.getActiveTab()

      service.goToNextTab()
      expect(service.getActiveTab()?.id).toEqual(originalActiveTab?.id)

      service.goToPreviousTab()
      expect(service.getActiveTab()?.id).toEqual(originalActiveTab?.id)

      service.goToFirstTab()
      expect(service.getActiveTab()?.id).toEqual(originalActiveTab?.id)

      service.goToLastTab()
      expect(service.getActiveTab()?.id).toEqual(originalActiveTab?.id)
    })
  })

  // NOTE: This feature is currently WIP.
  describe("Recently Closed Tabs", () => {
    it("should reopen closed tab", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      const tab2 = service.createNewTab({ request: "second request" })
      expect(service.getActiveTabs().value.length).toEqual(2)

      service.setActiveTab("test")

      service.closeTab(tab2.id)
      expect(service.getActiveTabs().value.length).toEqual(1)
      expect(service.getActiveTab()?.id).toEqual("test")

      const reopened = service.reopenClosedTab()
      expect(reopened).toBe(true)
      expect(service.getActiveTabs().value.length).toEqual(2)
      expect(service.getActiveTab()?.id).toEqual(tab2.id)
    })

    it("should return false when no tabs to reopen", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      const reopened = service.reopenClosedTab()
      expect(reopened).toBe(false)
      expect(service.getActiveTabs().value.length).toEqual(1)
    })

    it("should maintain closed tabs history with correct order", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      const tab2 = service.createNewTab({ request: "second request" })
      const tab3 = service.createNewTab({ request: "third request" })
      const tab4 = service.createNewTab({ request: "fourth request" })

      service.closeTab(tab2.id)
      service.closeTab(tab3.id)
      service.closeTab(tab4.id)

      expect(service.getActiveTabs().value.length).toEqual(1)

      service.reopenClosedTab()
      expect(service.getActiveTab()?.id).toEqual(tab4.id)

      service.reopenClosedTab()
      expect(service.getActiveTab()?.id).toEqual(tab3.id)

      service.reopenClosedTab()
      expect(service.getActiveTab()?.id).toEqual(tab2.id)

      expect(service.getActiveTabs().value.length).toEqual(4)
    })

    it("should restore tab at correct position when reopened", () => {
      const container = new TestContainer()
      const service = container.bind(MockTabService)

      const tab2 = service.createNewTab({ request: "second request" })
      const tab3 = service.createNewTab({ request: "third request" })

      const originalOrdering = service
        .getActiveTabs()
        .value.map((tab) => tab.id)
      expect(originalOrdering).toEqual(["test", tab2.id, tab3.id])

      service.closeTab(tab2.id)
      expect(service.getActiveTabs().value.map((tab) => tab.id)).toEqual([
        "test",
        tab3.id,
      ])

      service.reopenClosedTab()
      expect(service.getActiveTabs().value.map((tab) => tab.id)).toEqual([
        "test",
        tab2.id,
        tab3.id,
      ])
    })
  })
})
