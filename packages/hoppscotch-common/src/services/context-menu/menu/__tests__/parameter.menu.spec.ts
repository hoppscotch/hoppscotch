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

const tabMock = vi.hoisted(() => ({
  currentActiveTab: vi.fn(),
}))

vi.mock("~/helpers/rest/tab", () => ({
  __esModule: true,
  currentActiveTab: tabMock.currentActiveTab,
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

      it("should call the addParameter function when action is called", () => {
        const addParameterFn = vi.fn()

        const container = new TestContainer()
        const environment = container.bind(ParameterMenuService)

        const test = "https://hoppscotch.io"

        const result = environment.getMenuFor(test)

        const action = result.results[0].action

        action()

        expect(addParameterFn).toHaveBeenCalledOnce()
        expect(addParameterFn).toHaveBeenCalledWith(action)
      })

      it("should call the extractParams function when addParameter function is called", () => {
        const extractParamsFn = vi.fn()

        const container = new TestContainer()
        const environment = container.bind(ParameterMenuService)

        const test = "https://hoppscotch.io"

        const result = environment.getMenuFor(test)

        const action = result.results[0].action

        action()

        expect(extractParamsFn).toHaveBeenCalledOnce()
        expect(extractParamsFn).toHaveBeenCalledWith(action)
      })
    })
  })
})
