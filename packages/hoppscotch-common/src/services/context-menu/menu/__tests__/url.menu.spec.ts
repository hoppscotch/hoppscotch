import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { ContextMenuService } from "../.."
import { URLMenuService } from "../url.menu"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
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
      const url = new RegExp(
        /^(?:(?:https?|ftp):\/\/)?(?:www\.)?(?:[A-Za-z0-9_-]+\.)*[A-Za-z0-9_-]+(?::\d+)?$/
      )

      const container = new TestContainer()
      const environment = container.bind(URLMenuService)

      const test = "https://hoppscotch.io"
      const result = environment.getMenuFor(test)

      if (url.test(test)) {
        expect(result.results).toContainEqual(
          expect.objectContaining({ id: "link-tab" })
        )
      } else {
        expect(result).not.toContainEqual(
          expect.objectContaining({ id: "link-tab" })
        )
      }
    })
  })
})
