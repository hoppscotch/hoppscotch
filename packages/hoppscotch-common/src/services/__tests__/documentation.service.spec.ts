import { describe, it, expect, beforeEach, vi } from "vitest"
import * as E from "fp-ts/Either"
import { TestContainer } from "dioc/testing"
import {
  HoppCollection,
  HoppRESTRequest,
  makeCollection,
  makeRESTRequest,
} from "@hoppscotch/data"
import {
  DocumentationService,
  CollectionDocumentationItem,
  RequestDocumentationItem,
  SetCollectionDocumentationOptions,
  SetRequestDocumentationOptions,
} from "../documentation.service"
import {
  getUserPublishedDocs,
  getTeamPublishedDocs,
} from "~/helpers/backend/queries/PublishedDocs"

vi.mock("~/helpers/backend/queries/PublishedDocs", () => ({
  getUserPublishedDocs: vi.fn(),
  getTeamPublishedDocs: vi.fn(),
}))

describe("DocumentationService", () => {
  let container: TestContainer
  let service: DocumentationService

  // Test data
  const mockCollection: HoppCollection = makeCollection({
    name: "Test Collection",
    folders: [],
    requests: [],
    auth: { authType: "none", authActive: true },
    headers: [],
    variables: [],
    id: "collection-123",
    description: null,
  })

  const mockRequest: HoppRESTRequest = makeRESTRequest({
    name: "Test Request",
    endpoint: "https://api.example.com/test",
    method: "GET",
    headers: [],
    params: [],
    auth: { authType: "inherit", authActive: true },
    preRequestScript: "",
    testScript: "",
    body: { contentType: null, body: null },
    requestVariables: [],
    responses: {},
    description: null,
  })

  const mockCollectionOptions: SetCollectionDocumentationOptions = {
    isTeamItem: false,
    pathOrID: "test-path",
    collectionData: mockCollection,
  }

  const mockTeamCollectionOptions: SetCollectionDocumentationOptions = {
    isTeamItem: true,
    teamID: "team-456",
    pathOrID: "team-collection-789",
    collectionData: mockCollection,
  }

  const mockRequestOptions: SetRequestDocumentationOptions = {
    isTeamItem: false,
    parentCollectionID: "collection-123",
    folderPath: "test-folder",
    requestIndex: 0,
    requestData: mockRequest,
  }

  const mockTeamRequestOptions: SetRequestDocumentationOptions = {
    isTeamItem: true,
    teamID: "team-456",
    parentCollectionID: "collection-123",
    folderPath: "team-folder",
    requestID: "request-789",
    requestData: mockRequest,
  }

  beforeEach(() => {
    container = new TestContainer()
    service = container.bind(DocumentationService)
  })

  describe("Collection Documentation", () => {
    it("should set and get collection documentation", () => {
      const collectionId = "collection-123"
      const documentation = "# Test Collection\nThis is a test collection."

      service.setCollectionDocumentation(
        collectionId,
        documentation,
        mockCollectionOptions
      )

      expect(service.getDocumentation("collection", collectionId)).toBe(
        documentation
      )
    })

    it("should store complete collection documentation item", () => {
      const collectionId = "collection-123"
      const documentation = "# Test Collection\nThis is a test collection."

      service.setCollectionDocumentation(
        collectionId,
        documentation,
        mockCollectionOptions
      )

      const item = service.getDocumentationItem(
        "collection",
        collectionId
      ) as CollectionDocumentationItem

      expect(item).toEqual({
        type: "collection",
        id: collectionId,
        documentation,
        isTeamItem: false,
        teamID: undefined,
        pathOrID: "test-path",
        collectionData: mockCollection,
      })
    })

    it("should handle team collection documentation", () => {
      const collectionId = "team-collection-789"
      const documentation = "# Team Collection\nThis is a team collection."

      service.setCollectionDocumentation(
        collectionId,
        documentation,
        mockTeamCollectionOptions
      )

      const item = service.getDocumentationItem(
        "collection",
        collectionId
      ) as CollectionDocumentationItem

      expect(item.isTeamItem).toBe(true)
      expect(item.teamID).toBe("team-456")
    })

    it("should update existing collection documentation", () => {
      const collectionId = "collection-123"
      const originalDoc = "Original documentation"
      const updatedDoc = "Updated documentation"

      service.setCollectionDocumentation(
        collectionId,
        originalDoc,
        mockCollectionOptions
      )
      service.setCollectionDocumentation(
        collectionId,
        updatedDoc,
        mockCollectionOptions
      )

      expect(service.getDocumentation("collection", collectionId)).toBe(
        updatedDoc
      )
    })
  })

  describe("Request Documentation", () => {
    it("should set and get request documentation", () => {
      const requestId = "request-456"
      const documentation = "## Test Request\nThis is a test request."

      service.setRequestDocumentation(
        requestId,
        documentation,
        mockRequestOptions
      )

      expect(service.getDocumentation("request", requestId)).toBe(documentation)
    })

    it("should store complete request documentation item for personal requests", () => {
      const requestId = "request-456"
      const documentation = "## Test Request\nThis is a test request."

      service.setRequestDocumentation(
        requestId,
        documentation,
        mockRequestOptions
      )

      const item = service.getDocumentationItem(
        "request",
        requestId
      ) as RequestDocumentationItem

      expect(item).toEqual({
        type: "request",
        id: requestId,
        documentation,
        isTeamItem: false,
        teamID: undefined,
        parentCollectionID: "collection-123",
        folderPath: "test-folder",
        requestID: undefined,
        requestIndex: 0,
        requestData: mockRequest,
      })
    })

    it("should store complete request documentation item for team requests", () => {
      const requestId = "team-request-789"
      const documentation = "## Team Request\nThis is a team request."

      service.setRequestDocumentation(
        requestId,
        documentation,
        mockTeamRequestOptions
      )

      const item = service.getDocumentationItem(
        "request",
        requestId
      ) as RequestDocumentationItem

      expect(item).toEqual({
        type: "request",
        id: requestId,
        documentation,
        isTeamItem: true,
        teamID: "team-456",
        parentCollectionID: "collection-123",
        folderPath: "team-folder",
        requestID: "request-789",
        requestIndex: undefined,
        requestData: mockRequest,
      })
    })

    it("should get parent collection ID for request", () => {
      const requestId = "request-456"
      const documentation = "## Test Request\nThis is a test request."

      service.setRequestDocumentation(
        requestId,
        documentation,
        mockRequestOptions
      )

      expect(service.getParentCollectionID(requestId)).toBe("collection-123")
    })

    it("should return undefined for parent collection ID when request not found", () => {
      expect(service.getParentCollectionID("non-existent")).toBeUndefined()
    })
  })

  describe("Change Tracking", () => {
    it("should track if there are changes", () => {
      expect(service.hasChanges.value).toBe(false)

      service.setCollectionDocumentation(
        "collection-123",
        "Test documentation",
        mockCollectionOptions
      )

      expect(service.hasChanges.value).toBe(true)
    })

    it("should check if specific item has changes", () => {
      const collectionId = "collection-123"
      const requestId = "request-456"

      expect(service.hasItemChanges("collection", collectionId)).toBe(false)
      expect(service.hasItemChanges("request", requestId)).toBe(false)

      service.setCollectionDocumentation(
        collectionId,
        "Test documentation",
        mockCollectionOptions
      )

      expect(service.hasItemChanges("collection", collectionId)).toBe(true)
      expect(service.hasItemChanges("request", requestId)).toBe(false)
    })

    it("should return correct changes count", () => {
      expect(service.getChangesCount()).toBe(0)

      service.setCollectionDocumentation(
        "collection-123",
        "Collection doc",
        mockCollectionOptions
      )

      expect(service.getChangesCount()).toBe(1)

      service.setRequestDocumentation(
        "request-456",
        "Request doc",
        mockRequestOptions
      )

      expect(service.getChangesCount()).toBe(2)
    })

    it("should get all changed items", () => {
      service.setCollectionDocumentation(
        "collection-123",
        "Collection doc",
        mockCollectionOptions
      )
      service.setRequestDocumentation(
        "request-456",
        "Request doc",
        mockRequestOptions
      )

      const changes = service.getChangedItems()

      expect(changes).toHaveLength(2)
      expect(changes.some((item) => item.type === "collection")).toBe(true)
      expect(changes.some((item) => item.type === "request")).toBe(true)
    })
  })

  describe("Item Management", () => {
    beforeEach(() => {
      // Set up some test data
      service.setCollectionDocumentation(
        "collection-123",
        "Collection doc",
        mockCollectionOptions
      )
      service.setRequestDocumentation(
        "request-456",
        "Request doc",
        mockRequestOptions
      )
    })

    it("should remove specific item", () => {
      expect(service.hasItemChanges("collection", "collection-123")).toBe(true)
      expect(service.getChangesCount()).toBe(2)

      service.removeItem("collection", "collection-123")

      expect(service.hasItemChanges("collection", "collection-123")).toBe(false)
      expect(service.getChangesCount()).toBe(1)
    })

    it("should clear all changes", () => {
      expect(service.getChangesCount()).toBe(2)
      expect(service.hasChanges.value).toBe(true)

      service.clearAll()

      expect(service.getChangesCount()).toBe(0)
      expect(service.hasChanges.value).toBe(false)
    })
  })

  describe("Edge Cases", () => {
    it("should return undefined for non-existent documentation", () => {
      expect(
        service.getDocumentation("collection", "non-existent")
      ).toBeUndefined()
      expect(
        service.getDocumentation("request", "non-existent")
      ).toBeUndefined()
    })

    it("should return undefined for non-existent documentation item", () => {
      expect(
        service.getDocumentationItem("collection", "non-existent")
      ).toBeUndefined()
      expect(
        service.getDocumentationItem("request", "non-existent")
      ).toBeUndefined()
    })

    it("should handle empty documentation strings", () => {
      const collectionId = "collection-empty"
      const emptyDoc = ""

      service.setCollectionDocumentation(
        collectionId,
        emptyDoc,
        mockCollectionOptions
      )

      expect(service.getDocumentation("collection", collectionId)).toBe(
        emptyDoc
      )
    })

    it("should handle documentation with special characters", () => {
      const collectionId = "collection-special"
      const specialDoc =
        "# Test 🚀\n\n**Bold** _italic_ `code`\n\n- List item\n- Another item"

      service.setCollectionDocumentation(
        collectionId,
        specialDoc,
        mockCollectionOptions
      )

      expect(service.getDocumentation("collection", collectionId)).toBe(
        specialDoc
      )
    })

    it("should handle very long documentation", () => {
      const collectionId = "collection-long"
      const longDoc = "# Long Documentation\n" + "A".repeat(10000)

      service.setCollectionDocumentation(
        collectionId,
        longDoc,
        mockCollectionOptions
      )

      expect(service.getDocumentation("collection", collectionId)).toBe(longDoc)
    })

    it("should return undefined for parent collection ID when item is not a request", () => {
      service.setCollectionDocumentation(
        "collection-123",
        "Collection doc",
        mockCollectionOptions
      )

      // The key will be collection_collection-123, which won't match request_ prefix
      expect(service.getParentCollectionID("collection-123")).toBeUndefined()
    })
  })

  describe("Reactive Properties", () => {
    it("should reactively update hasChanges computed property", () => {
      expect(service.hasChanges.value).toBe(false)

      service.setCollectionDocumentation(
        "collection-123",
        "Test doc",
        mockCollectionOptions
      )

      expect(service.hasChanges.value).toBe(true)

      service.clearAll()

      expect(service.hasChanges.value).toBe(false)
    })
  })

  describe("Published Documentation", () => {
    it("should fetch user published docs and update map", async () => {
      const mockDocs = [
        {
          id: "doc-1",
          collection: { id: "col-1" },
          title: "Doc 1",
          version: "v1",
          autoSync: true,
          url: "url-1",
        },
      ]

      vi.mocked(getUserPublishedDocs).mockReturnValue(() =>
        Promise.resolve(E.right(mockDocs as any))
      )

      await service.fetchUserPublishedDocs()

      const status = service.getPublishedDocStatus("col-1")
      expect(status).toEqual({
        id: "doc-1",
        title: "Doc 1",
        version: "v1",
        autoSync: true,
        url: "url-1",
      })
    })

    it("should fetch team published docs and update map", async () => {
      const mockDocs = [
        {
          id: "doc-2",
          collection: { id: "col-2" },
          title: "Doc 2",
          version: "v2",
          autoSync: false,
          url: "url-2",
        },
      ]

      vi.mocked(getTeamPublishedDocs).mockReturnValue(() =>
        Promise.resolve(E.right(mockDocs as any))
      )

      await service.fetchTeamPublishedDocs("team-1")

      const status = service.getPublishedDocStatus("col-2")
      expect(status).toEqual({
        id: "doc-2",
        title: "Doc 2",
        version: "v2",
        autoSync: false,
        url: "url-2",
      })
    })

    it("should handle error when fetching user published docs", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      vi.mocked(getUserPublishedDocs).mockReturnValue(() =>
        Promise.resolve(E.left("user/not_authenticated"))
      )

      await service.fetchUserPublishedDocs()

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch user published docs:",
        "user/not_authenticated"
      )
      consoleSpy.mockRestore()
    })

    it("should handle error when fetching team published docs", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      vi.mocked(getTeamPublishedDocs).mockReturnValue(() =>
        Promise.resolve(E.left("team/not_required" as any))
      )

      await service.fetchTeamPublishedDocs("team-1")

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch team published docs:",
        "team/not_required"
      )
      consoleSpy.mockRestore()
    })

    it("should manually set published doc status", () => {
      const info = {
        id: "doc-3",
        title: "Doc 3",
        version: "v3",
        autoSync: true,
        url: "url-3",
      }

      service.setPublishedDocStatus("col-3", info)

      expect(service.getPublishedDocStatus("col-3")).toEqual(info)
    })

    it("should remove published doc status", () => {
      const info = {
        id: "doc-3",
        title: "Doc 3",
        version: "v3",
        autoSync: true,
        url: "url-3",
      }

      service.setPublishedDocStatus("col-3", info)
      expect(service.getPublishedDocStatus("col-3")).toBeDefined()

      service.setPublishedDocStatus("col-3", null)
      expect(service.getPublishedDocStatus("col-3")).toBeUndefined()
    })

    it("should handle race conditions by ignoring stale responses", async () => {
      const slowDocs = [
        {
          id: "doc-slow",
          collection: { id: "col-1" },
          title: "Slow Doc",
          version: "v1",
          autoSync: true,
          url: "url-slow",
        },
      ]

      const fastDocs = [
        {
          id: "doc-fast",
          collection: { id: "col-1" },
          title: "Fast Doc",
          version: "v2",
          autoSync: true,
          url: "url-fast",
        },
      ]

      let resolveSlow: (value: any) => void
      const slowPromise = new Promise((resolve) => {
        resolveSlow = resolve
      })

      // Mock the first call to be slow
      vi.mocked(getUserPublishedDocs)
        .mockReturnValueOnce(() => slowPromise as any)
        .mockReturnValueOnce(() => Promise.resolve(E.right(fastDocs as any)))

      // Start the slow request
      const firstCall = service.fetchUserPublishedDocs()

      // Start the fast request immediately after
      const secondCall = service.fetchUserPublishedDocs()

      // Wait for the fast request to complete
      await secondCall

      // Verify the fast response is applied
      expect(service.getPublishedDocStatus("col-1")).toEqual({
        id: "doc-fast",
        title: "Fast Doc",
        version: "v2",
        autoSync: true,
        url: "url-fast",
      })

      // Now resolve the slow request
      resolveSlow!(E.right(slowDocs as any))
      await firstCall

      // Verify the state hasn't changed (slow response ignored)
      expect(service.getPublishedDocStatus("col-1")).toEqual({
        id: "doc-fast",
        title: "Fast Doc",
        version: "v2",
        autoSync: true,
        url: "url-fast",
      })
    })
  })
})
