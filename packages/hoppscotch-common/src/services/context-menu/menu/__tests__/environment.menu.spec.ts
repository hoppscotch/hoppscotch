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
    navigateToFolderWithIndexPath: vi.fn(),
    restCollectionStore: {
      value: { state: [] },
    },
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

    // ─── Personal Collection Tests ─────────────────────────────────────────────

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

      vi.mocked(collectionsStore.navigateToFolderWithIndexPath).mockReturnValue(
        {
          _ref_id: "collection-ref-id",
          name: "My Collection",
        } as any
      )

      const environment = container.bind(EnvironmentMenuService)
      const result = environment.getMenuFor("sample-value")

      expect(result.results).toContainEqual(
        expect.objectContaining({ id: "collection" })
      )
    })

    it("calls navigateToFolderWithIndexPath with the full index path (not just root index)", () => {
      const container = new TestContainer()

      container.bindMock(RESTTabService, {
        currentActiveTab: {
          value: {
            document: {
              type: "request",
              saveContext: {
                originLocation: "user-collection",
                folderPath: "0/1/2",
                requestIndex: 0,
              },
            },
          },
        },
      })

      container.bindMock(TeamCollectionsService, {
        collections: { value: [] },
      })

      // Return null so no collection action is added — we only test the call args
      vi.mocked(collectionsStore.navigateToFolderWithIndexPath).mockReturnValue(
        null
      )

      const environment = container.bind(EnvironmentMenuService)
      environment.getMenuFor("sample-value")

      expect(
        collectionsStore.navigateToFolderWithIndexPath
      ).toHaveBeenCalledWith(
        collectionsStore.restCollectionStore.value.state,
        [0, 1, 2]
      )
    })

    it("passes the full folderPath as collectionPath (not just root index) for nested folders", () => {
      const container = new TestContainer()
      const folderPath = "0/1/2"

      container.bindMock(RESTTabService, {
        currentActiveTab: {
          value: {
            document: {
              type: "request",
              saveContext: {
                originLocation: "user-collection",
                folderPath,
                requestIndex: 0,
              },
            },
          },
        },
      })

      container.bindMock(TeamCollectionsService, {
        collections: { value: [] },
      })

      vi.mocked(collectionsStore.navigateToFolderWithIndexPath).mockReturnValue(
        {
          _ref_id: "deep-ref-id",
          name: "Deep Folder",
        } as any
      )

      const environment = container.bind(EnvironmentMenuService)
      const result = environment.getMenuFor("var-name")

      const collectionAction = result.results.find((r) => r.id === "collection")
      expect(collectionAction).toBeDefined()

      actionsMock.invokeAction.mockClear()
      collectionAction!.action()

      expect(actionsMock.invokeAction).toHaveBeenCalledWith(
        "modals.environment.add",
        expect.objectContaining({
          scope: "collection",
          collection: expect.objectContaining({
            originLocation: "user-collection",
            collectionRefID: "deep-ref-id",
            collectionPath: folderPath, // must be "0/1/2", not "0"
            collectionName: "Deep Folder",
          }),
        })
      )
    })

    it("does not show collection action for personal collection when folder is not found", () => {
      const container = new TestContainer()

      container.bindMock(RESTTabService, {
        currentActiveTab: {
          value: {
            document: {
              type: "request",
              saveContext: {
                originLocation: "user-collection",
                folderPath: "99/0",
                requestIndex: 0,
              },
            },
          },
        },
      })

      container.bindMock(TeamCollectionsService, {
        collections: { value: [] },
      })

      vi.mocked(collectionsStore.navigateToFolderWithIndexPath).mockReturnValue(
        null
      )

      const environment = container.bind(EnvironmentMenuService)
      const result = environment.getMenuFor("sample-value")

      expect(result.results).not.toContainEqual(
        expect.objectContaining({ id: "collection" })
      )
    })

    // ─── Team Collection Tests ─────────────────────────────────────────────────

    it("shows collection variable action for saved team-collection requests", () => {
      const container = new TestContainer()

      container.bindMock(RESTTabService, {
        currentActiveTab: {
          value: {
            document: {
              type: "request",
              saveContext: {
                originLocation: "team-collection",
                collectionID: "rootID/childID",
              },
            },
          },
        },
      })

      container.bindMock(TeamCollectionsService, {
        collections: {
          value: [
            {
              id: "rootID",
              title: "Root Collection",
              children: [
                {
                  id: "childID",
                  title: "Child Folder",
                  children: null,
                  requests: null,
                },
              ],
              requests: null,
            },
          ],
        },
      })

      const environment = container.bind(EnvironmentMenuService)
      const result = environment.getMenuFor("sample-value")

      expect(result.results).toContainEqual(
        expect.objectContaining({ id: "collection" })
      )
    })

    it("extracts leaf ID from collectionID path and invokes action with correct name and ID", () => {
      const container = new TestContainer()

      container.bindMock(RESTTabService, {
        currentActiveTab: {
          value: {
            document: {
              type: "request",
              saveContext: {
                originLocation: "team-collection",
                // saveContext stores a full path; the leaf should be "childID"
                collectionID: "rootID/childID",
              },
            },
          },
        },
      })

      container.bindMock(TeamCollectionsService, {
        collections: {
          value: [
            {
              id: "rootID",
              title: "Root Collection",
              children: [
                {
                  id: "childID",
                  title: "Child Folder",
                  children: null,
                  requests: null,
                },
              ],
              requests: null,
            },
          ],
        },
      })

      const environment = container.bind(EnvironmentMenuService)
      const result = environment.getMenuFor("sample-value")

      const collectionAction = result.results.find((r) => r.id === "collection")
      expect(collectionAction).toBeDefined()

      actionsMock.invokeAction.mockClear()
      collectionAction!.action()

      expect(actionsMock.invokeAction).toHaveBeenCalledWith(
        "modals.environment.add",
        expect.objectContaining({
          scope: "collection",
          collection: expect.objectContaining({
            originLocation: "team-collection",
            collectionID: "childID", // must be the leaf ID, not "rootID/childID"
            collectionName: "Child Folder",
          }),
        })
      )
    })

    it("does not show collection action when team collection leaf ID is not found in tree", () => {
      const container = new TestContainer()

      container.bindMock(RESTTabService, {
        currentActiveTab: {
          value: {
            document: {
              type: "request",
              saveContext: {
                originLocation: "team-collection",
                collectionID: "rootID/unknownID",
              },
            },
          },
        },
      })

      container.bindMock(TeamCollectionsService, {
        collections: {
          value: [
            {
              id: "rootID",
              title: "Root Collection",
              children: [
                {
                  id: "childID",
                  title: "Child Folder",
                  children: null,
                  requests: null,
                },
              ],
              requests: null,
            },
          ],
        },
      })

      const environment = container.bind(EnvironmentMenuService)
      const result = environment.getMenuFor("sample-value")

      expect(result.results).not.toContainEqual(
        expect.objectContaining({ id: "collection" })
      )
    })

    it("resolves deeply nested team collection by leaf ID from multi-segment path", () => {
      const container = new TestContainer()

      container.bindMock(RESTTabService, {
        currentActiveTab: {
          value: {
            document: {
              type: "request",
              saveContext: {
                originLocation: "team-collection",
                collectionID: "rootID/midID/leafID",
              },
            },
          },
        },
      })

      container.bindMock(TeamCollectionsService, {
        collections: {
          value: [
            {
              id: "rootID",
              title: "Root",
              children: [
                {
                  id: "midID",
                  title: "Mid Level",
                  children: [
                    {
                      id: "leafID",
                      title: "Leaf Folder",
                      children: null,
                      requests: null,
                    },
                  ],
                  requests: null,
                },
              ],
              requests: null,
            },
          ],
        },
      })

      const environment = container.bind(EnvironmentMenuService)
      const result = environment.getMenuFor("deep-var")

      const collectionAction = result.results.find((r) => r.id === "collection")
      expect(collectionAction).toBeDefined()

      actionsMock.invokeAction.mockClear()
      collectionAction!.action()

      expect(actionsMock.invokeAction).toHaveBeenCalledWith(
        "modals.environment.add",
        expect.objectContaining({
          scope: "collection",
          collection: expect.objectContaining({
            originLocation: "team-collection",
            collectionID: "leafID",
            collectionName: "Leaf Folder",
          }),
        })
      )
    })
  })
})
