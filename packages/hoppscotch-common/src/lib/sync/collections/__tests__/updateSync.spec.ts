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
  moveUserCollection: vi.fn(),
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

  it("propagates error when deleteUserRequest fails", async () => {
    vi.mocked(api.updateUserCollection).mockResolvedValue(
      E.right({ updateUserCollection: { id: "backend-coll-id" } } as any)
    )
    vi.mocked(api.deleteUserRequest).mockResolvedValue(
      E.left("Network error deleting request" as any)
    )

    const original = makeCollection({
      id: "backend-coll-id",
      name: "My API",
      folders: [],
      requests: [
        {
          id: "to-delete-req",
          v: "1",
          endpoint: "https://api.com/delete",
          name: "Delete Me",
          method: "DELETE",
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
      folders: [],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const res = await syncPersonalRESTCollectionUpdate(original, final)

    expect(E.isLeft(res)).toBe(true)
    if (E.isLeft(res)) {
      expect(res.left).toBe("Network error deleting request")
    }
  })

  it("propagates error when deleteUserCollection fails", async () => {
    vi.mocked(api.updateUserCollection).mockResolvedValue(
      E.right({ updateUserCollection: { id: "backend-coll-id" } } as any)
    )
    vi.mocked(api.deleteUserCollection).mockResolvedValue(
      E.left("Network error deleting folder" as any)
    )

    const original = makeCollection({
      id: "backend-coll-id",
      name: "My API",
      folders: [
        makeCollection({
          id: "to-delete-folder",
          name: "Delete Folder",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
      ],
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
    if (E.isLeft(res)) {
      expect(res.left).toBe("Network error deleting folder")
    }
  })

  it("propagates error when moveUserRequest fails", async () => {
    vi.mocked(api.updateUserCollection).mockResolvedValue(
      E.right({ updateUserCollection: { id: "backend-coll-id" } } as any)
    )
    vi.mocked(api.moveUserRequest).mockResolvedValue(
      E.left("Network error moving request" as any)
    )

    const original = makeCollection({
      id: "backend-coll-id",
      name: "My API",
      folders: [
        makeCollection({
          id: "folder-1",
          name: "Folder 1",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
      ],
      requests: [
        {
          id: "req-to-move",
          v: "1",
          endpoint: "https://api.com/move",
          name: "Move Me",
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
          id: "folder-1",
          name: "Folder 1",
          folders: [],
          requests: [
            {
              id: "req-to-move",
              v: "1",
              endpoint: "https://api.com/move",
              name: "Move Me",
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
        }),
      ],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const res = await syncPersonalRESTCollectionUpdate(original, final)

    expect(E.isLeft(res)).toBe(true)
    expect(api.moveUserRequest).toHaveBeenCalledWith(
      "backend-coll-id",
      "folder-1",
      "req-to-move"
    )
  })

  it("moves existing folder to new parent via moveUserCollection and propagates error on failure", async () => {
    vi.mocked(api.updateUserCollection).mockResolvedValue(
      E.right({ updateUserCollection: { id: "backend-coll-id" } } as any)
    )
    vi.mocked(api.moveUserCollection).mockResolvedValue(
      E.left("Network error moving collection" as any)
    )

    // Original: f2 is inside f1
    const original = makeCollection({
      id: "backend-coll-id",
      name: "My API",
      folders: [
        makeCollection({
          id: "f1",
          name: "Folder 1",
          folders: [
            makeCollection({
              id: "f2",
              name: "Folder 2",
              folders: [],
              requests: [],
              auth: { authType: "inherit", authActive: true },
              headers: [],
              variables: [],
            }),
          ],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
      ],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    // Final: f2 is now a direct child of the root collection
    const final = makeCollection({
      name: "My API Updated",
      folders: [
        makeCollection({
          id: "f1",
          name: "Folder 1",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
        makeCollection({
          id: "f2",
          name: "Folder 2",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
      ],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const res = await syncPersonalRESTCollectionUpdate(original, final)

    expect(E.isLeft(res)).toBe(true)
    expect(api.moveUserCollection).toHaveBeenCalledWith("f2", "backend-coll-id")
  })

  it("does not delete requests or folders if a prior update or create mutation fails", async () => {
    vi.mocked(api.updateUserCollection).mockResolvedValue(
      E.right({ updateUserCollection: { id: "backend-coll-id" } } as any)
    )
    vi.mocked(api.createRESTUserRequest).mockResolvedValue(
      E.left("Request creation failed" as any)
    )

    const original = makeCollection({
      id: "backend-coll-id",
      name: "My API",
      folders: [
        makeCollection({
          id: "folder-to-del",
          name: "Folder To Delete",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
      ],
      requests: [
        {
          id: "req-to-del",
          v: "1",
          endpoint: "https://api.com/req-to-del",
          name: "Req To Del",
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

    // Final has a new request (no id) which will fail to create
    const final = makeCollection({
      name: "My API Updated",
      folders: [],
      requests: [
        {
          v: "1",
          endpoint: "https://api.com/new-broken",
          name: "New Broken",
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
    })

    const res = await syncPersonalRESTCollectionUpdate(original, final)

    expect(E.isLeft(res)).toBe(true)
    // Deletions MUST NOT be executed when earlier mutations fail
    expect(api.deleteUserRequest).not.toHaveBeenCalled()
    expect(api.deleteUserCollection).not.toHaveBeenCalled()
  })

  it("avoids redundant deleteUserCollection calls for child folders when parent folder is also deleted", async () => {
    vi.mocked(api.updateUserCollection).mockResolvedValue(
      E.right({ updateUserCollection: { id: "backend-coll-id" } } as any)
    )
    vi.mocked(api.deleteUserCollection).mockResolvedValue(
      E.right({ deleteUserCollection: true } as any)
    )

    const original = makeCollection({
      id: "backend-coll-id",
      name: "My API",
      folders: [
        makeCollection({
          id: "parent-folder",
          name: "Parent Folder",
          folders: [
            makeCollection({
              id: "child-folder",
              name: "Child Folder",
              folders: [],
              requests: [],
              auth: { authType: "inherit", authActive: true },
              headers: [],
              variables: [],
            }),
          ],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
      ],
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

    expect(E.isRight(res)).toBe(true)
    // Only the top-level removed folder should have deleteUserCollection called
    expect(api.deleteUserCollection).toHaveBeenCalledTimes(1)
    expect(api.deleteUserCollection).toHaveBeenCalledWith("parent-folder")
    expect(api.deleteUserCollection).not.toHaveBeenCalledWith("child-folder")
  })
})
