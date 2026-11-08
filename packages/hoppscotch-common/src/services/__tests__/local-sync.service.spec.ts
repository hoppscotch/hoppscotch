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
} from "@hoppscotch/data"
import {
  LocalSyncService,
  sanitizeFileName,
  serializeAllCollectionsToDir,
  deserializeAllCollectionsFromDir,
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

  describe("Directory Serialization and Deserialization", () => {
    let rootDir: MockDirectoryHandle

    beforeEach(() => {
      rootDir = new MockDirectoryHandle("project-repo")
    })

    it("should serialize a collection into multi-file structure and deserialize back with round-trip fidelity", async () => {
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
      })

      const sampleCollection = makeCollection({
        name: "User Service API",
        folders: [subfolder],
        requests: [sampleReq1, sampleReq2],
        auth: {
          authType: "bearer",
          authActive: true,
          token: "secret-token",
        },
        headers: [{ key: "X-Trace-Id", value: "abc", active: true }],
        variables: [],
        description: "User management APIs",
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
      expect(collectionsDir.directories.has("User Service API")).toBe(true)

      const colDir = collectionsDir.directories.get("User Service API")!
      // Check multi-file breakdown
      expect(colDir.files.has("_collection.json")).toBe(true)
      expect(colDir.files.has("Get User By ID.json")).toBe(true)
      expect(colDir.files.has("Create User.json")).toBe(true)
      expect(colDir.directories.has("User Roles Subfolder")).toBe(true)

      const subDir = colDir.directories.get("User Roles Subfolder")!
      expect(subDir.files.has("_collection.json")).toBe(true)
      expect(subDir.files.has("Get User Roles.json")).toBe(true)

      // Deserialization round-trip
      const deserialized = await deserializeAllCollectionsFromDir(
        rootDir as unknown as FileSystemDirectoryHandle
      )

      expect(deserialized.length).toBe(1)
      const restored = deserialized[0]
      expect(restored.name).toBe("User Service API")
      expect(restored.description).toBe("User management APIs")
      expect(restored.requests.length).toBe(2)
      expect(restored.requests[0].name).toBe("Get User By ID")
      expect(restored.requests[0].endpoint).toBe(
        "https://api.example.com/users/123"
      )
      expect(restored.requests[1].name).toBe("Create User")

      expect(restored.folders.length).toBe(1)
      expect(restored.folders[0].name).toBe("User Roles Subfolder")
      expect(restored.folders[0].requests.length).toBe(1)
      expect(restored.folders[0].requests[0].name).toBe("Get User Roles")
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

  it("should correctly disconnect and reset states", async () => {
    await service.disconnect()
    expect(service.isConnected.value).toBe(false)
    expect(service.directoryName.value).toBeNull()
    expect(service.syncStatus.value).toBe("disconnected")
  })
})
