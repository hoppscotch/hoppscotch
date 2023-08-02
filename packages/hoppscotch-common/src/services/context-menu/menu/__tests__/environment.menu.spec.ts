import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { EnvironmentMenuService } from "../environment.menu"
import { ContextMenuService } from "../.."

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

const actionsMock = vi.hoisted(() => ({
  invokeAction: vi.fn(),
}))

vi.mock("~/helpers/actions", async () => {
  return {
    __esModule: true,
    invokeAction: actionsMock.invokeAction,
  }
})

describe("EnvironmentMenuService", () => {
  it("registers with the contextmenu service upon initialization", () => {
    const container = new TestContainer()

    const registerContextMenuFn = vi.fn()

    container.bindMock(ContextMenuService, {
      registerMenu: registerContextMenuFn,
    })

    const environment = container.bind(EnvironmentMenuService)

    expect(registerContextMenuFn).toHaveBeenCalledOnce()
    expect(registerContextMenuFn).toHaveBeenCalledWith(environment)
  })

  describe("getMenuFor", () => {
    it("should return a menu for adding environment", () => {
      const container = new TestContainer()
      const environment = container.bind(EnvironmentMenuService)

      const test = "some-text"
      const result = environment.getMenuFor(test)

      expect(result.results).toContainEqual(
        expect.objectContaining({ id: "environment" })
      )
    })

    it("should invoke the add environment modal", () => {
      const container = new TestContainer()
      const environment = container.bind(EnvironmentMenuService)

      const test = "some-text"
      const result = environment.getMenuFor(test)

      const action = result.results[0].action
      action()
      expect(actionsMock.invokeAction).toHaveBeenCalledOnce()
      expect(actionsMock.invokeAction).toHaveBeenCalledWith(
        "modals.environment.add",
        {
          envName: "test",
          variableName: test,
        }
      )
    })
  })
})
