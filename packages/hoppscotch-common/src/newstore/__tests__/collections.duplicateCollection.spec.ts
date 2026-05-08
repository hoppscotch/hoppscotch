import { describe, expect, it, vi } from "vitest"
import {
  HoppCollection,
  makeCollection,
  getDefaultRESTRequest,
} from "@hoppscotch/data"

// Mock the i18n module used by the duplicateCollection dispatcher
vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
}))

// Mock the dioc service locator used at module scope in collections.ts
vi.mock("~/modules/dioc", () => ({
  getService: () => ({
    getSecretEnvironmentVariable: () => undefined,
    getCurrentValue: () => undefined,
  }),
}))

// Mock the RESTTabService used at module scope
vi.mock("~/services/tab/rest", () => ({
  RESTTabService: class {},
}))

// Mock the SecretEnvironmentService
vi.mock("~/services/secret-environment.service", () => ({
  SecretEnvironmentService: class {},
}))

// Mock the CurrentValueService
vi.mock("~/services/current-environment-value.service", () => ({
  CurrentValueService: class {},
}))

// Mock the scripting helper
vi.mock("~/helpers/scripting", () => ({
  hasActualScript: () => false,
}))

// Mock the collection request helper
vi.mock("~/helpers/collection/request", () => ({
  resolveSaveContextOnRequestReorder: () => {},
}))

import {
  restCollectionStore,
  setRESTCollections,
  duplicateRESTCollection,
  editRESTRequest,
  graphqlCollectionStore,
  setGraphqlCollections,
  editGraphqlRequest,
} from "~/newstore/collections"

function makeRequest(overrides: Record<string, any> = {}) {
  return {
    ...getDefaultRESTRequest(),
    id: undefined,
    name: "Test Request",
    ...overrides,
  }
}

function makeTestCollection(
  overrides: Partial<HoppCollection> = {}
): HoppCollection {
  return makeCollection({
    name: "Test Collection",
    folders: [],
    requests: [],
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    description: null,
    preRequestScript: "",
    testScript: "",
    ...overrides,
  })
}

describe("duplicateCollection — ID clearing", () => {
  /**
   * Helper: sets up the store with the given collections, dispatches
   * duplicateRESTCollection, and returns the resulting store state.
   */
  function duplicateAndGetState(
    collections: HoppCollection[],
    path: string
  ): HoppCollection[] {
    setRESTCollections(collections)
    duplicateRESTCollection(path)
    return restCollectionStore.value.state
  }

  it("should clear backend IDs from all requests in the duplicate", () => {
    const original = makeTestCollection({
      id: "coll-backend-1",
      name: "My Collection",
      requests: [
        makeRequest({ id: "req-backend-1", name: "Get Pets" }),
        makeRequest({ id: "req-backend-2", name: "Add Pet" }),
      ],
    })

    const result = duplicateAndGetState([original], "0")

    expect(result).toHaveLength(2)
    const duplicate = result[1]

    // All request IDs in the duplicate should be undefined (cleared)
    for (const req of duplicate.requests) {
      expect(req.id).toBeUndefined()
    }
  })

  it("should preserve backend IDs on the original collection", () => {
    const original = makeTestCollection({
      id: "coll-backend-1",
      name: "My Collection",
      requests: [
        makeRequest({ id: "req-backend-1", name: "Get Pets" }),
        makeRequest({ id: "req-backend-2", name: "Add Pet" }),
      ],
    })

    const result = duplicateAndGetState([original], "0")

    // The original (index 0) should still have its backend IDs
    expect(result[0].id).toBe("coll-backend-1")
    expect(result[0].requests[0].id).toBe("req-backend-1")
    expect(result[0].requests[1].id).toBe("req-backend-2")
  })

  it("should set root collection ID with '-duplicate-collection' suffix", () => {
    const original = makeTestCollection({
      id: "coll-backend-1",
      name: "My Collection",
    })

    const result = duplicateAndGetState([original], "0")

    const duplicate = result[1]
    expect(duplicate.id).toBe("coll-backend-1-duplicate-collection")
  })

  it("should clear backend IDs from nested folders", () => {
    const original = makeTestCollection({
      id: "coll-root",
      name: "Root",
      folders: [
        makeTestCollection({
          id: "coll-child-1",
          name: "Child Folder",
          requests: [makeRequest({ id: "req-child-1", name: "Child Request" })],
          folders: [
            makeTestCollection({
              id: "coll-grandchild",
              name: "Grandchild",
              requests: [
                makeRequest({ id: "req-gc-1", name: "Grandchild Request" }),
              ],
            }),
          ],
        }),
      ],
    })

    const result = duplicateAndGetState([original], "0")

    const duplicate = result[1]

    // Root gets the suffix, not cleared
    expect(duplicate.id).toBe("coll-root-duplicate-collection")

    // Nested folder IDs should be cleared
    expect(duplicate.folders[0].id).toBeUndefined()
    expect(duplicate.folders[0].folders[0].id).toBeUndefined()

    // All nested request IDs should be cleared
    expect(duplicate.folders[0].requests[0].id).toBeUndefined()
    expect(duplicate.folders[0].folders[0].requests[0].id).toBeUndefined()
  })

  it("should generate new _ref_id for all requests in the duplicate", () => {
    const originalRefId = "original-ref-id"
    const original = makeTestCollection({
      id: "coll-1",
      name: "Collection",
      requests: [
        makeRequest({ id: "req-1", _ref_id: originalRefId, name: "Req 1" }),
      ],
    })

    const result = duplicateAndGetState([original], "0")

    const duplicate = result[1]

    // Duplicate request should have a new _ref_id, not the original's
    expect(duplicate.requests[0]._ref_id).not.toBe(originalRefId)
    expect(duplicate.requests[0]._ref_id).toBeDefined()
  })

  it("should generate new _ref_id for all folders in the duplicate", () => {
    const originalRefId = "original-folder-ref"
    const original = makeTestCollection({
      id: "coll-1",
      name: "Collection",
      _ref_id: originalRefId,
      folders: [
        makeTestCollection({
          id: "coll-child",
          name: "Child",
          _ref_id: "child-ref",
        }),
      ],
    })

    const result = duplicateAndGetState([original], "0")

    const duplicate = result[1]

    // Duplicate collection and its folders should have new _ref_ids
    expect(duplicate._ref_id).not.toBe(originalRefId)
    expect(duplicate.folders[0]._ref_id).not.toBe("child-ref")
  })

  it("should handle collections without backend IDs", () => {
    const original = makeTestCollection({
      name: "Local Collection",
      requests: [makeRequest({ name: "Local Request" })],
    })

    const result = duplicateAndGetState([original], "0")

    expect(result).toHaveLength(2)
    const duplicate = result[1]
    // When original has no id, duplicate should not have the suffix either
    expect(duplicate.id).toBeUndefined()
    expect(duplicate.requests[0].id).toBeUndefined()
  })

  it("should not share object references between original and duplicate", () => {
    const original = makeTestCollection({
      id: "coll-1",
      name: "Collection",
      requests: [makeRequest({ id: "req-1", name: "Request 1" })],
      folders: [
        makeTestCollection({
          id: "coll-child",
          name: "Child",
          requests: [makeRequest({ id: "req-child-1", name: "Child Request" })],
        }),
      ],
    })

    const result = duplicateAndGetState([original], "0")

    const duplicate = result[1]

    // Modifying the duplicate's request should not affect the original
    duplicate.requests[0].name = "Modified"
    expect(result[0].requests[0].name).toBe("Request 1")

    // Modifying nested folder request should not affect original
    duplicate.folders[0].requests[0].name = "Modified Child"
    expect(result[0].folders[0].requests[0].name).toBe("Child Request")
  })

  it("should duplicate a sub-folder (non-root) correctly", () => {
    const root = makeTestCollection({
      id: "coll-root",
      name: "Root",
      folders: [
        makeTestCollection({
          id: "coll-child",
          name: "Child Folder",
          requests: [makeRequest({ id: "req-1", name: "Child Request" })],
        }),
      ],
    })

    const result = duplicateAndGetState([root], "0/0")

    // The root should now have 2 child folders
    expect(result[0].folders).toHaveLength(2)

    const duplicatedChild = result[0].folders[1]

    // Root of the duplicate subfolder gets the suffix
    expect(duplicatedChild.id).toBe("coll-child-duplicate-collection")

    // Request IDs inside the duplicated subfolder should be cleared
    expect(duplicatedChild.requests[0].id).toBeUndefined()
  })

  it("should preserve request content (method, endpoint, etc.) in the duplicate", () => {
    const original = makeTestCollection({
      id: "coll-1",
      name: "API Collection",
      requests: [
        makeRequest({
          id: "req-1",
          name: "Get Pets",
          method: "GET",
          endpoint: "https://petstore.swagger.io/v2/pet",
        }),
        makeRequest({
          id: "req-2",
          name: "Add Pet",
          method: "POST",
          endpoint: "https://petstore.swagger.io/v2/pet",
        }),
      ],
    })

    const result = duplicateAndGetState([original], "0")

    const duplicate = result[1]

    expect(duplicate.requests[0].name).toBe("Get Pets")
    expect(duplicate.requests[0].method).toBe("GET")
    expect(duplicate.requests[0].endpoint).toBe(
      "https://petstore.swagger.io/v2/pet"
    )

    expect(duplicate.requests[1].name).toBe("Add Pet")
    expect(duplicate.requests[1].method).toBe("POST")
  })
})

describe("editRequest — ID preservation", () => {
  it("REST: should preserve existing backend ID when requestNew has no id", () => {
    const collection = makeTestCollection({
      id: "coll-1",
      name: "Collection",
      requests: [
        makeRequest({ id: "req-backend-1", name: "Original Request" }),
      ],
    })

    setRESTCollections([collection])

    const updatedRequest = makeRequest({ name: "Updated Request" })
    // requestNew.id is undefined — the existing backend ID should be preserved
    editRESTRequest("0", 0, updatedRequest as any)

    const result = restCollectionStore.value.state
    expect(result[0].requests[0].name).toBe("Updated Request")
    expect(result[0].requests[0].id).toBe("req-backend-1")
  })

  it("REST: should use requestNew.id when it is provided", () => {
    const collection = makeTestCollection({
      id: "coll-1",
      name: "Collection",
      requests: [
        makeRequest({ id: "req-backend-1", name: "Original Request" }),
      ],
    })

    setRESTCollections([collection])

    const updatedRequest = makeRequest({
      id: "req-new-id",
      name: "Updated Request",
    })
    editRESTRequest("0", 0, updatedRequest as any)

    const result = restCollectionStore.value.state
    expect(result[0].requests[0].id).toBe("req-new-id")
  })

  it("GQL: should preserve existing backend ID when requestNew has no id", () => {
    const collection = makeTestCollection({
      id: "coll-1",
      name: "GQL Collection",
      requests: [
        makeRequest({ id: "gql-req-backend-1", name: "Original GQL Query" }),
      ],
    })

    setGraphqlCollections([collection])

    const updatedRequest = makeRequest({ name: "Updated GQL Query" })
    editGraphqlRequest("0", 0, updatedRequest as any)

    const result = graphqlCollectionStore.value.state
    expect(result[0].requests[0].name).toBe("Updated GQL Query")
    expect(result[0].requests[0].id).toBe("gql-req-backend-1")
  })

  it("GQL: should use requestNew.id when it is provided", () => {
    const collection = makeTestCollection({
      id: "coll-1",
      name: "GQL Collection",
      requests: [
        makeRequest({ id: "gql-req-backend-1", name: "Original GQL Query" }),
      ],
    })

    setGraphqlCollections([collection])

    const updatedRequest = makeRequest({
      id: "gql-req-new-id",
      name: "Updated GQL Query",
    })
    editGraphqlRequest("0", 0, updatedRequest as any)

    const result = graphqlCollectionStore.value.state
    expect(result[0].requests[0].id).toBe("gql-req-new-id")
  })
})
