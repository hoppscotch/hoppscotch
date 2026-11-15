import { describe, expect, it, beforeEach, vi } from "vitest"
import { TestContainer } from "dioc/testing"

// Mock module-scope circularity from i18n
vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))

import {
  makeCollection,
  makeRESTRequest,
  getDefaultRESTRequest,
  makeGQLRequest,
} from "@hoppscotch/data"
import {
  LocalSyncService,
  sanitizeFileName,
  getUniqueName,
  serializeAllCollectionsToDir,
  deserializeAllCollectionsFromDir,
  preserveExistingLocalIds,
} from "../local-sync.service"

// In-memory mock for W3C File System Access API
class MockFileHandle {
  public kind = "file" as const
  constructor(
    public name: string,
    public content: string = ""
  ) {}

  async getFile() {
    return {
      text: async () => this.content,
    }
  }

  async createWritable() {
    return {
      write: async (data: string) => {
        this.content = data
      },
      close: async () => {},
    }
  }
}

class MockDirectoryHandle {
  public kind = "directory" as const
  public files = new Map<string, MockFileHandle>()
  public directories = new Map<string, MockDirectoryHandle>()

  constructor(public name: string) {}

  async getFileHandle(name: string, options?: { create?: boolean }) {
    if (this.files.has(name)) return this.files.get(name)!
    if (options?.create) {
      const file = new MockFileHandle(name)
      this.files.set(name, file)
      return file
    }
    throw new Error(`File not found: ${name}`)
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    if (this.directories.has(name)) return this.directories.get(name)!
    if (options?.create) {
      const dir = new MockDirectoryHandle(name)
      this.directories.set(name, dir)
      return dir
    }
    throw new Error(`Directory not found: ${name}`)
  }

  async removeEntry(name: string, _options?: { recursive?: boolean }) {
    this.files.delete(name)
    this.directories.delete(name)
  }

  async *values() {
    for (const file of this.files.values()) {
      yield file
    }
    for (const dir of this.directories.values()) {
      yield dir
    }
  }

  async queryPermission() {
    return "granted" as PermissionState
  }

  async requestPermission() {
    return "granted" as PermissionState
  }
}

describe("LocalSyncService File Utilities", () => {
  describe("sanitizeFileName", () => {
    it("should sanitize illegal characters on Windows and UNIX", () => {
      expect(sanitizeFileName("Get /users/profile:id")).toBe(
        "Get -users-profile-id"
      )
      expect(sanitizeFileName("Test*File?Name<1>|2")).toBe(
        "Test-File-Name-1--2"
      )
      expect(sanitizeFileName("   Whitespace  Test   ")).toBe("Whitespace Test")
      expect(sanitizeFileName(".hiddenFile")).toBe("hiddenFile")
      expect(sanitizeFileName("")).toBe("untitled")
    })
  })

  describe("getUniqueName", () => {
    it("should resolve collisions deterministically by appending suffix", () => {
      const used = new Set<string>()
      const name1 = getUniqueName("Get User", "ref_111111", used, ".json")
      const name2 = getUniqueName("Get User", "ref_222222", used, ".json")
      const name3 = getUniqueName("Get User", "ref_222222", used, ".json")

      expect(name1).toBe("Get User.json")
      expect(name2).toBe("Get User-222222.json")
      expect(name3).toBe("Get User-222222-1.json")
    })
  })

  describe("Directory Serialization and Deserialization", () => {
    let rootDir: MockDirectoryHandle

    beforeEach(() => {
      rootDir = new MockDirectoryHandle("project-repo")
    })

    it("should serialize and deserialize REST and GraphQL requests with full fidelity", async () => {
      const sampleReq1 = makeRESTRequest({
        ...getDefaultRESTRequest(),
        name: "Get User By ID",
        endpoint: "https://api.example.com/users/123",
        method: "GET",
      })

      const sampleReq2 = makeRESTRequest({
        ...getDefaultRESTRequest(),
        name: "Create User",
        endpoint: "https://api.example.com/users",
        method: "POST",
      })

      const sampleGQL = makeGQLRequest({
        name: "GraphQL User Query",
        url: "https://api.example.com/graphql",
        query: "query { user { id name } }",
        headers: [],
        variables: "{}",
        auth: { authType: "inherit", authActive: true },
      })

      const subReq = makeRESTRequest({
        ...getDefaultRESTRequest(),
        name: "Get User Roles",
        endpoint: "https://api.example.com/users/123/roles",
        method: "GET",
      })

      const subfolder = makeCollection({
        name: "User Roles Subfolder",
        folders: [],
        requests: [subReq],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      })

      const sampleCollection = makeCollection({
        name: "User Service API",
        folders: [subfolder],
        requests: [sampleReq1, sampleReq2, sampleGQL],
        auth: {
          authType: "bearer",
          authActive: true,
          token: "secret-token",
        },
        headers: [{ key: "X-Trace-Id", value: "abc", active: true }],
        variables: [],
        description: "User management APIs",
        preRequestScript: "// pre-request",
        testScript: "// test",
      })

      // Serialize into mock root
      await serializeAllCollectionsToDir(
        [sampleCollection],
        rootDir as unknown as FileSystemDirectoryHandle
      )

      // Verify directory structure created
      expect(rootDir.directories.has(".hoppscotch")).toBe(true)
      const hoppDir = rootDir.directories.get(".hoppscotch")!
      expect(hoppDir.directories.has("collections")).toBe(true)

      const collectionsDir = hoppDir.directories.get("collections")!
      expect(collectionsDir.files.has("_order.json")).toBe(true)
      expect(collectionsDir.directories.has("User Service API")).toBe(true)

      const colDir = collectionsDir.directories.get("User Service API")!
      expect(colDir.files.has("_collection.json")).toBe(true)
      expect(colDir.files.has("Get User By ID.json")).toBe(true)
      expect(colDir.files.has("Create User.json")).toBe(true)
      expect(colDir.files.has("GraphQL User Query.json")).toBe(true)
      expect(colDir.directories.has("User Roles Subfolder")).toBe(true)

      // Deserialization round-trip
      const deserialized = await deserializeAllCollectionsFromDir(
        rootDir as unknown as FileSystemDirectoryHandle
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.length).toBe(1)
      const restored = deserialized![0]
      expect(restored.name).toBe("User Service API")
      expect(restored.description).toBe("User management APIs")
      expect(restored.auth).toEqual(sampleCollection.auth)
      expect(restored.headers).toEqual(sampleCollection.headers)
      expect(restored.preRequestScript).toBe("// pre-request")
      expect(restored.testScript).toBe("// test")

      expect(restored.requests.length).toBe(3)
      expect(restored.requests[0].name).toBe("Get User By ID")
      expect((restored.requests[0] as any).endpoint).toBe(
        "https://api.example.com/users/123"
      )
      expect(restored.requests[1].name).toBe("Create User")
      expect((restored.requests[1] as any).method).toBe("POST")

      // Verify GraphQL request handled
      expect(restored.requests[2].name).toBe("GraphQL User Query")
      expect((restored.requests[2] as any).query).toBe(
        "query { user { id name } }"
      )

      expect(restored.folders.length).toBe(1)
      expect(restored.folders[0].name).toBe("User Roles Subfolder")
      expect(restored.folders[0].requests.length).toBe(1)
      expect(restored.folders[0].requests[0].name).toBe("Get User Roles")
    })

    it("should preserve top-level collection order across serializations", async () => {
      const colA = makeCollection({
        name: "Collection Alpha",
        folders: [],
        requests: [],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      })

      const colB = makeCollection({
        name: "Collection Beta",
        folders: [],
        requests: [],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      })

      // Serialize in order [B, A]
      await serializeAllCollectionsToDir(
        [colB, colA],
        rootDir as unknown as FileSystemDirectoryHandle
      )

      const restored = await deserializeAllCollectionsFromDir(
        rootDir as unknown as FileSystemDirectoryHandle
      )

      expect(restored).not.toBeNull()
      expect(restored!.length).toBe(2)
      expect(restored![0].name).toBe("Collection Beta")
      expect(restored![1].name).toBe("Collection Alpha")
    })

    it("should fail fast when a file contains invalid JSON (e.g. Git conflict markers)", async () => {
      const collection = makeCollection({
        name: "Conflict Collection",
        folders: [],
        requests: [],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      })

      await serializeAllCollectionsToDir(
        [collection],
        rootDir as unknown as FileSystemDirectoryHandle
      )

      const colDir = rootDir.directories
        .get(".hoppscotch")!
        .directories.get("collections")!
        .directories.get("Conflict Collection")!

      // Simulate a git conflict marker in an endpoint file
      colDir.files.set(
        "Conflicted Request.json",
        new MockFileHandle(
          "Conflicted Request.json",
          '<<<<<<< HEAD\n{ "name": "A" }\n=======\n{ "name": "B" }\n>>>>>>> branch'
        )
      )

      await expect(
        deserializeAllCollectionsFromDir(
          rootDir as unknown as FileSystemDirectoryHandle
        )
      ).rejects.toThrow(/Failed to parse JSON in "Conflicted Request.json"/)
    })

    it("should prune deleted requests and subfolders on re-serialization", async () => {
      const reqA = makeRESTRequest({
        ...getDefaultRESTRequest(),
        name: "Request A",
        endpoint: "https://api.example.com/a",
      })
      const reqB = makeRESTRequest({
        ...getDefaultRESTRequest(),
        name: "Request B",
        endpoint: "https://api.example.com/b",
      })

      const collection = makeCollection({
        name: "Prune Test Collection",
        folders: [],
        requests: [reqA, reqB],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      })

      await serializeAllCollectionsToDir(
        [collection],
        rootDir as unknown as FileSystemDirectoryHandle
      )

      const colDir = rootDir.directories
        .get(".hoppscotch")!
        .directories.get("collections")!
        .directories.get("Prune Test Collection")!

      expect(colDir.files.has("Request A.json")).toBe(true)
      expect(colDir.files.has("Request B.json")).toBe(true)

      // Remove reqB and re-serialize
      collection.requests = [reqA]
      await serializeAllCollectionsToDir(
        [collection],
        rootDir as unknown as FileSystemDirectoryHandle
      )

      expect(colDir.files.has("Request A.json")).toBe(true)
      expect(colDir.files.has("Request B.json")).toBe(false)
    })

    it("should strip account-specific IDs on export and preserve local IDs on import reconciliation", async () => {
      const req = makeRESTRequest({
        ...getDefaultRESTRequest(),
        name: "Login Endpoint",
        endpoint: "https://api.example.com/login",
      })
      ;(req as any).id = "remote-account-req-id-123"

      const collection = makeCollection({
        name: "Auth Service",
        folders: [],
        requests: [req],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      })
      collection.id = "remote-account-col-id-456"

      await serializeAllCollectionsToDir(
        [collection],
        rootDir as unknown as FileSystemDirectoryHandle
      )

      const colDir = rootDir.directories
        .get(".hoppscotch")!
        .directories.get("collections")!
        .directories.get("Auth Service")!

      // Verify IDs are stripped from shared disk files
      const meta = JSON.parse(
        (colDir.files.get("_collection.json") as MockFileHandle).content
      )
      expect(meta.id).toBeUndefined()

      const reqContent = JSON.parse(
        (colDir.files.get("Login Endpoint.json") as MockFileHandle).content
      )
      expect(reqContent.id).toBeUndefined()

      // Deserialized disk copy should have no account ID
      const deserialized = await deserializeAllCollectionsFromDir(
        rootDir as unknown as FileSystemDirectoryHandle
      )
      expect(deserialized![0].id).toBeUndefined()
      expect((deserialized![0].requests[0] as any).id).toBeUndefined()

      // preserveExistingLocalIds should reattach existing local IDs when available
      const localCollections = [collection]
      const reconciled = preserveExistingLocalIds(
        deserialized!,
        localCollections
      )
      expect(reconciled[0].id).toBe("remote-account-col-id-456")
      expect((reconciled[0].requests[0] as any).id).toBe(
        "remote-account-req-id-123"
      )
    })
  })
})

describe("LocalSyncService Container Binding", () => {
  let container: TestContainer
  let service: LocalSyncService

  beforeEach(() => {
    container = new TestContainer()
    service = container.bind(LocalSyncService)
  })

  it("should initialize with default disconnected state and autoSync enabled", () => {
    expect(service.isConnected.value).toBe(false)
    expect(service.directoryName.value).toBeNull()
    expect(service.isSyncing.value).toBe(false)
    expect(service.syncStatus.value).toBe("disconnected")
    expect(service.autoSync.value).toBe(true)
    expect(service.syncError.value).toBeNull()
  })

  it("should report isSupported true when window.showDirectoryPicker is available", () => {
    const original = (window as any).showDirectoryPicker
    try {
      Object.defineProperty(window, "showDirectoryPicker", {
        value: vi.fn(),
        configurable: true,
        writable: true,
      })
      const testContainer = new TestContainer()
      const supportedService = testContainer.bind(LocalSyncService)
      expect(supportedService.isSupported.value).toBe(true)
    } finally {
      delete (window as any).showDirectoryPicker
      if (original) {
        ;(window as any).showDirectoryPicker = original
      }
    }
  })

  it("should correctly disconnect and reset states", async () => {
    await service.disconnect()
    expect(service.isConnected.value).toBe(false)
    expect(service.directoryName.value).toBeNull()
    expect(service.syncStatus.value).toBe("disconnected")
  })
})
