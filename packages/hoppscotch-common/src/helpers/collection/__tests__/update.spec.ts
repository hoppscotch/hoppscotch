import { describe, it, expect } from "vitest"
import { makeCollection } from "@hoppscotch/data"
import { mergeCollectionTree } from "../update"

describe("mergeCollectionTree", () => {
  it("merges incoming requests and adds new endpoints", () => {
    const existing = makeCollection({
      name: "API Coll",
      folders: [],
      requests: [
        {
          v: "1",
          endpoint: "https://api.com/users",
          name: "Get Users",
          method: "GET",
          auth: { authType: "inherit", authActive: true },
          headers: [],
          params: [],
          body: { contentType: null, body: null },
          preRequestScript: "// existing script",
          testScript: "// existing test",
        },
      ],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const incoming = [
      makeCollection({
        name: "API Coll Updated",
        folders: [],
        requests: [
          {
            v: "1",
            endpoint: "https://api.com/users",
            name: "Get Users Updated",
            method: "GET",
            auth: { authType: "inherit", authActive: true },
            headers: [
              { key: "Accept", value: "application/json", active: true },
            ],
            params: [],
            body: { contentType: null, body: null },
            preRequestScript: "",
            testScript: "",
          },
          {
            v: "1",
            endpoint: "https://api.com/posts",
            name: "Get Posts",
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
    ]

    const { updatedCollection, stats } = mergeCollectionTree(
      existing,
      incoming,
      { preserveScripts: true, keepMissingRequests: true }
    )

    expect(stats.updatedRequests).toBe(1)
    expect(stats.addedRequests).toBe(1)
    expect(stats.preservedScripts).toBe(2)
    expect(updatedCollection.requests.length).toBe(2)

    // Verify scripts were preserved
    const updatedUserReq = updatedCollection.requests.find(
      (r: any) => r.endpoint === "https://api.com/users"
    ) as any
    expect(updatedUserReq.preRequestScript).toBe("// existing script")
    expect(updatedUserReq.testScript).toBe("// existing test")
    expect(updatedUserReq.headers.length).toBe(1)
  })

  it("deletes missing requests and folders when keepMissingRequests is false", () => {
    const existing = makeCollection({
      name: "API Coll",
      folders: [
        makeCollection({
          name: "Old Folder",
          folders: [],
          requests: [
            {
              v: "1",
              endpoint: "https://api.com/old-req",
              name: "Old Request",
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
      requests: [
        {
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
          v: "1",
          endpoint: "https://api.com/to-delete",
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

    const incoming = [
      makeCollection({
        name: "API Coll",
        folders: [],
        requests: [
          {
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
        ],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
      }),
    ]

    const { updatedCollection, stats } = mergeCollectionTree(
      existing,
      incoming,
      { preserveScripts: true, keepMissingRequests: false }
    )

    expect(stats.updatedRequests).toBe(1)
    expect(stats.deletedRequests).toBe(2) // 1 from root (to-delete) + 1 from Old Folder
    expect(updatedCollection.requests.length).toBe(1)
    expect(updatedCollection.folders.length).toBe(0)
  })

  it("counts preserved scripts in retained folders and subtrees when keepMissingRequests is true", () => {
    const existing = makeCollection({
      name: "API Coll",
      folders: [
        makeCollection({
          name: "Retained Folder",
          folders: [],
          requests: [
            {
              v: "1",
              endpoint: "https://api.com/retained-req",
              name: "Retained Request",
              method: "GET",
              auth: { authType: "inherit", authActive: true },
              headers: [],
              params: [],
              body: { contentType: null, body: null },
              preRequestScript: "pw.env.set('a', '1')",
              testScript: "pw.test('ok', () => {})",
            },
          ],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
          preRequestScript: "console.log('folder pre')",
          testScript: "console.log('folder test')",
        }),
      ],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    const incoming = [
      makeCollection({
        name: "API Coll",
        folders: [],
        requests: [
          {
            v: "1",
            endpoint: "https://api.com/new-req",
            name: "New Request",
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
    ]

    const { stats } = mergeCollectionTree(existing, incoming, {
      preserveScripts: true,
      keepMissingRequests: true,
    })

    expect(stats.preservedRequests).toBe(1)
    // 2 folder scripts + 2 request scripts = 4 preserved scripts
    expect(stats.preservedScripts).toBe(4)
  })
})
