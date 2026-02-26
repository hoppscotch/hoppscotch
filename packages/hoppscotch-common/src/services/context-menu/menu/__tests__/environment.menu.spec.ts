import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi } from "vitest"
import { EnvironmentMenuService } from "../environment.menu"
import { ContextMenuService } from "../.."
import { RESTTabService } from "~/services/tab/rest"
import { TeamCollectionsService } from "~/services/team-collection.service"
import * as collectionsStore from "~/newstore/collections"

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

vi.mock("~/newstore/collections", async () => {
  const actual = await vi.importActual<typeof import("~/newstore/collections")>(
    "~/newstore/collections"
  )

  return {
    ...actual,
    getRESTCollection: vi.fn(),
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
    const bindDefaults = (container: TestContainer) => {
      container.bindMock(RESTTabService, {
        currentActiveTab: {
          value: null,
        },
      })

      container.bindMock(TeamCollectionsService, {
        collections: {
          value: [],
        },
      })
    }

    it("should return a menu for adding environment", () => {
      const container = new TestContainer()
      bindDefaults(container)
      const environment = container.bind(EnvironmentMenuService)

      const test = "some-text"
      const result = environment.getMenuFor(test)

      expect(result.results).toContainEqual(
        expect.objectContaining({ id: "environment" })
      )
    })

    it("should invoke the add environment modal", () => {
      const container = new TestContainer()
      bindDefaults(container)
      const environment = container.bind(EnvironmentMenuService)

      const test = "some-text"
      const result = environment.getMenuFor(test)

      const action = result.results[0].action
      action()
      expect(actionsMock.invokeAction).toHaveBeenCalledOnce()
      expect(actionsMock.invokeAction).toHaveBeenCalledWith(
        "modals.environment.add",
        {
          envName: "",
          variableName: test,
        }
      )
    })

    it("shows collection variable action for saved personal collection requests", () => {
      const container = new TestContainer()

      container.bindMock(RESTTabService, {
        currentActiveTab: {
          value: {
            document: {
              type: "request",
              saveContext: {
                originLocation: "user-collection",
                folderPath: "0/1",
                requestIndex: 0,
              },
            },
          },
        },
      })

      container.bindMock(TeamCollectionsService, {
        collections: { value: [] },
      })

      vi.mocked(collectionsStore.getRESTCollection).mockReturnValue({
        _ref_id: "collection-ref-id",
        name: "My Collection",
      } as any)

      const environment = container.bind(EnvironmentMenuService)
      const result = environment.getMenuFor("sample-value")

      expect(result.results).toContainEqual(
        expect.objectContaining({ id: "collection" })
      )
    })
  })
})
