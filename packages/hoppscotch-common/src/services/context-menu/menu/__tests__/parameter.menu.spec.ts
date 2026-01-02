import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { ContextMenuService } from "../.."
import { ParameterMenuService } from "../parameter.menu"

//regex containing both url and parameter
const urlAndParameterRegex = new RegExp("[^&?]*?=[^&?]*")

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

describe("ParameterMenuService", () => {
  it("registers with the contextmenu service upon initialization", () => {
    const container = new TestContainer()

    const registerContextMenuFn = vi.fn()

    container.bindMock(ContextMenuService, {
      registerMenu: registerContextMenuFn,
    })

    const parameter = container.bind(ParameterMenuService)

    expect(registerContextMenuFn).toHaveBeenCalledOnce()
    expect(registerContextMenuFn).toHaveBeenCalledWith(parameter)
  })

  describe("getMenuFor", () => {
    it("validating if the text passes the regex and return the menu", () => {
      const container = new TestContainer()
      const parameter = container.bind(ParameterMenuService)

      const test = "https://hoppscotch.io?id=some-text"
      const result = parameter.getMenuFor(test)

      if (test.match(urlAndParameterRegex)) {
        expect(result.results).toContainEqual(
          expect.objectContaining({ id: "parameter" })
        )
      } else {
        expect(result.results).not.toContainEqual(
          expect.objectContaining({ id: "parameter" })
        )
      }
    })

    it("should return a result with an action when text contains parameters", () => {
      const container = new TestContainer()
      const parameter = container.bind(ParameterMenuService)

      const test = "https://hoppscotch.io?id=some-text"

      const result = parameter.getMenuFor(test)

      expect(result.results).toHaveLength(1)
      expect(result.results[0]).toHaveProperty("action")
      expect(typeof result.results[0].action).toBe("function")
    })

    it("should return empty results when text does not contain parameters", () => {
      const container = new TestContainer()
      const parameter = container.bind(ParameterMenuService)

      const test = "https://hoppscotch.io"

      const result = parameter.getMenuFor(test)

      expect(result.results).toHaveLength(0)
    })
  })
})
