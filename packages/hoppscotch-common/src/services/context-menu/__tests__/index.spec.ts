import { describe, it, expect, vi } from "vitest"
import { ContextMenu, ContextMenuResult, ContextMenuService } from "../"
import { TestContainer } from "dioc/testing"

const contextMenuResult: ContextMenuResult[] = [
  {
    id: "result1",
    text: { type: "text", text: "Sample Text" },
    icon: {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    action: () => {},
  },
]

const testMenu: ContextMenu = {
  menuID: "menu1",
  getMenuFor: () => {
    return {
      results: contextMenuResult,
    }
  },
}

describe("ContextMenuService", () => {
  describe("registerMenu", () => {
    it("should register a menu", () => {
      const container = new TestContainer()
      const service = container.bind(ContextMenuService)

      service.registerMenu(testMenu)

      const result = service.getMenuFor("text")

      expect(result).toContainEqual(expect.objectContaining({ id: "result1" }))
    })

    it("should not register a menu twice", () => {
      const container = new TestContainer()
      const service = container.bind(ContextMenuService)

      service.registerMenu(testMenu)
      service.registerMenu(testMenu)

      const result = service.getMenuFor("text")

      expect(result).toHaveLength(1)
    })

    it("should register multiple menus", () => {
      const container = new TestContainer()
      const service = container.bind(ContextMenuService)

      const testMenu2: ContextMenu = {
        menuID: "menu2",
        getMenuFor: () => {
          return {
            results: contextMenuResult,
          }
        },
      }

      service.registerMenu(testMenu)
      service.registerMenu(testMenu2)

      const result = service.getMenuFor("text")

      expect(result).toHaveLength(2)
    })
  })

  describe("getMenuFor", () => {
    it("should get the menu", () => {
      const sampleMenus = {
        results: contextMenuResult,
      }

      const container = new TestContainer()
      const service = container.bind(ContextMenuService)

      service.registerMenu(testMenu)

      const results = service.getMenuFor("sometext")

      expect(results).toEqual(sampleMenus.results)
    })

    it("calls registered menus with correct value", () => {
      const container = new TestContainer()
      const service = container.bind(ContextMenuService)

      const testMenu2: ContextMenu = {
        menuID: "some-id",
        getMenuFor: vi.fn(() => ({
          results: contextMenuResult,
        })),
      }

      service.registerMenu(testMenu2)

      service.getMenuFor("sometext")

      expect(testMenu2.getMenuFor).toHaveBeenCalledWith("sometext")
    })

    it("should return empty array if no menus are registered", () => {
      const container = new TestContainer()
      const service = container.bind(ContextMenuService)

      const results = service.getMenuFor("sometext")

      expect(results).toEqual([])
    })
  })
})
