import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { syncPersonalRESTCollectionUpdate } from "../updateSync"
import * as api from "../api"
import { platform } from "~/platform"
import { settingsStore } from "~/newstore/settings"

vi.mock("../api", () => ({
  createRESTChildUserCollection: vi.fn(),
  createRESTUserRequest: vi.fn(),
  deleteUserCollection: vi.fn(),
  deleteUserRequest: vi.fn(),
  editUserRequest: vi.fn(),
  moveUserRequest: vi.fn(),
  updateUserCollection: vi.fn(),
}))

vi.mock("~/newstore/settings", () => ({
  settingsStore: {
    value: {
      syncCollections: true,
    },
  },
}))

vi.mock("~/platform", () => ({
  platform: {
    auth: {
      getCurrentUser: vi.fn(() => ({ uid: "test-user-id" })),
    },
  },
}))

describe("syncPersonalRESTCollectionUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settingsStore.value.syncCollections = true
    vi.mocked(platform.auth.getCurrentUser).mockReturnValue({
      uid: "test-user-id",
    } as any)
  })

  it("returns immediately without calling backend APIs if collection has no id", async () => {
    const original = makeCollection({
      name: "Local Coll",
      folders: [],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })
    const final = makeCollection({
      name: "Local Coll Updated",
      folders: [],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const res = await syncPersonalRESTCollectionUpdate(original, final)

    expect(E.isRight(res)).toBe(true)
    expect(api.updateUserCollection).not.toHaveBeenCalled()
  })

  it("returns immediately without calling backend APIs if sync is disabled", async () => {
    settingsStore.value.syncCollections = false

    const original = makeCollection({
      id: "backend-coll-id",
      name: "Synced Coll",
      folders: [],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })
    const final = makeCollection({
      name: "Synced Coll Updated",
      folders: [],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const res = await syncPersonalRESTCollectionUpdate(original, final)

    expect(E.isRight(res)).toBe(true)
    expect(api.updateUserCollection).not.toHaveBeenCalled()
  })

  it("synchronizes diff: updates root, creates new requests and folders, edits updated requests, and deletes removed items", async () => {
    vi.mocked(api.updateUserCollection).mockResolvedValue(
      E.right({ updateUserCollection: { id: "backend-coll-id" } } as any)
    )
    vi.mocked(api.createRESTChildUserCollection).mockResolvedValue(
      E.right({
        createRESTChildUserCollection: { id: "new-folder-backend-id" },
      } as any)
    )
    vi.mocked(api.createRESTUserRequest).mockResolvedValue(
      E.right({ createRESTUserRequest: { id: "new-req-backend-id" } } as any)
    )
    vi.mocked(api.editUserRequest).mockResolvedValue(
      E.right({ updateRESTUserRequest: { id: "existing-req-id" } } as any)
    )
    vi.mocked(api.deleteUserRequest).mockResolvedValue(
      E.right({ deleteUserRequest: true } as any)
    )
    vi.mocked(api.deleteUserCollection).mockResolvedValue(
      E.right({ deleteUserCollection: true } as any)
    )

    const original = makeCollection({
      id: "backend-coll-id",
      name: "My API",
      folders: [
        makeCollection({
          id: "old-folder-id",
          name: "Old Folder",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
      ],
      requests: [
        {
          id: "existing-req-id",
          v: "1",
          endpoint: "https://api.com/users",
          name: "Get Users",
          method: "GET",
          auth: { authType: "inherit", authActive: true },
          headers: [],
          params: [],
          body: { contentType: null, body: null },
          preRequestScript: "",
          testScript: "",
        },
        {
          id: "deleted-req-id",
          v: "1",
          endpoint: "https://api.com/deprecated",
          name: "Deprecated",
          method: "GET",
          auth: { authType: "inherit", authActive: true },
          headers: [],
          params: [],
          body: { contentType: null, body: null },
          preRequestScript: "",
          testScript: "",
        },
      ],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const final = makeCollection({
      name: "My API Updated",
      folders: [
        makeCollection({
          // New folder without ID
          name: "New Folder",
          folders: [],
          requests: [
            {
              // New request without ID
              v: "1",
              endpoint: "https://api.com/new-feature",
              name: "New Feature",
              method: "POST",
              auth: { authType: "inherit", authActive: true },
              headers: [],
              params: [],
              body: { contentType: null, body: null },
              preRequestScript: "",
              testScript: "",
            },
          ],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
      ],
      requests: [
        {
          // Existing request with updated endpoint
          id: "existing-req-id",
          v: "1",
          endpoint: "https://api.com/v2/users",
          name: "Get Users V2",
          method: "GET",
          auth: { authType: "inherit", authActive: true },
          headers: [],
          params: [],
          body: { contentType: null, body: null },
          preRequestScript: "",
          testScript: "",
        },
      ],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const result = await syncPersonalRESTCollectionUpdate(original, final)

    expect(E.isRight(result)).toBe(true)

    // Root metadata updated
    expect(api.updateUserCollection).toHaveBeenCalledWith(
      "backend-coll-id",
      "My API Updated",
      expect.any(String)
    )

    // Removed request deleted
    expect(api.deleteUserRequest).toHaveBeenCalledWith("deleted-req-id")

    // Removed folder deleted
    expect(api.deleteUserCollection).toHaveBeenCalledWith("old-folder-id")

    // Existing request edited
    expect(api.editUserRequest).toHaveBeenCalledWith(
      "existing-req-id",
      "Get Users V2",
      expect.any(String)
    )

    // New folder created
    expect(api.createRESTChildUserCollection).toHaveBeenCalledWith(
      "New Folder",
      "backend-coll-id",
      expect.any(String)
    )

    // New request created under new folder
    expect(api.createRESTUserRequest).toHaveBeenCalledWith(
      "New Feature",
      expect.any(String),
      "new-folder-backend-id"
    )

    // Final collection has backend IDs populated
    if (E.isRight(result)) {
      expect(result.right.folders[0].id).toBe("new-folder-backend-id")
      expect(result.right.folders[0].requests[0].id).toBe("new-req-backend-id")
    }
  })

  it("returns error if root collection update fails", async () => {
    vi.mocked(api.updateUserCollection).mockResolvedValue(
      E.left("Network error updating collection" as any)
    )

    const original = makeCollection({
      id: "backend-coll-id",
      name: "My API",
      folders: [],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })
    const final = makeCollection({
      name: "My API Updated",
      folders: [],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const res = await syncPersonalRESTCollectionUpdate(original, final)

    expect(E.isLeft(res)).toBe(true)
  })
})
