import { describe, it, expect, beforeEach } from "vitest"
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
})
