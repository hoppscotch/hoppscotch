import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { ContextMenuService } from "../.."
import { URLMenuService } from "../url.menu"
import { getDefaultRESTRequest } from "~/helpers/rest/default"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

const tabMock = vi.hoisted(() => ({
  createNewTab: vi.fn(),
}))

vi.mock("~/helpers/rest/tab", () => ({
  __esModule: true,
  createNewTab: tabMock.createNewTab,
}))

describe("URLMenuService", () => {
  it("registers with the contextmenu service upon initialization", () => {
    const container = new TestContainer()

    const registerContextMenuFn = vi.fn()

    container.bindMock(ContextMenuService, {
      registerMenu: registerContextMenuFn,
    })

    const environment = container.bind(URLMenuService)

    expect(registerContextMenuFn).toHaveBeenCalledOnce()
    expect(registerContextMenuFn).toHaveBeenCalledWith(environment)
  })

  describe("getMenuFor", () => {
    it("validating if the text passes the regex and return the menu", () => {
      const urlRegex = new RegExp(
        /^(?:(?:https?|ftp):\/\/)?(?:www\.)?(?:[A-Za-z0-9_-]+\.)*[A-Za-z0-9_-]+(?::\d+)?$/
      )

      const container = new TestContainer()
      const url = container.bind(URLMenuService)

      const test = ""
      const result = url.getMenuFor(test)

      if (urlRegex.test(test)) {
        expect(result.results).toContainEqual(
          expect.objectContaining({ id: "link-tab" })
        )
      } else {
        expect(result).toEqual({ results: [] })
      }
    })

    it("should call the openNewTab function when action is called and a new hoppscotch tab is opened", () => {
      const container = new TestContainer()
      const url = container.bind(URLMenuService)

      const test = "https://hoppscotch.io"
      const result = url.getMenuFor(test)

      result.results[0].action()

      const request = {
        ...getDefaultRESTRequest(),
        endpoint: test,
      }

      expect(tabMock.createNewTab).toHaveBeenCalledOnce()
      expect(tabMock.createNewTab).toHaveBeenCalledWith({
        request: request,
        isDirty: false,
      })
    })

    it("should call the openInBrowser function when action is called and a new browser tab is opened", () => {
      const browserMock = vi.hoisted(() => ({
        open: vi.fn(),
      }))

      window.open = browserMock.open

      const container = new TestContainer()
      const url = container.bind(URLMenuService)

      const test = "https://hoppscotch.io"
      const result = url.getMenuFor(test)

      result.results[1].action(test)

      expect(browserMock.open).toHaveBeenCalledOnce()
      expect(browserMock.open).toHaveBeenCalledWith(
        test,
        "_blank",
        "noopener noreferrer"
      )
    })
  })
})
