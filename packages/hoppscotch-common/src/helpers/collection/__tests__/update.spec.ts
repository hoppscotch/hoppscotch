import { describe, it, expect } from "vitest"
import { makeCollection } from "@hoppscotch/data"
import { mergeCollectionTree } from "../update"
import { getService } from "~/modules/dioc"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { CurrentValueService } from "~/services/current-environment-value.service"

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

  it("does not match a REST request to a GraphQL request with the same name (Comment 2)", () => {
    const existing = makeCollection({
      name: "API Coll",
      folders: [],
      requests: [
        {
          v: "1",
          name: "Fetch Info",
          url: "https://api.com/graphql",
          query: "query { info { id } }",
          headers: [],
          variables: "",
          auth: { authType: "inherit", authActive: true },
        } as any,
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
            endpoint: "https://api.com/rest/info",
            name: "Fetch Info",
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

    // REST request should NOT match GQL request despite having the same name
    expect(stats.updatedRequests).toBe(0)
    expect(stats.addedRequests).toBe(1)
    expect(stats.preservedRequests).toBe(1)
    expect(updatedCollection.requests.length).toBe(2)

    // The existing GQL request should still have its query intact
    const gqlReq = updatedCollection.requests.find(
      (r: any) => "query" in r
    ) as any
    expect(gqlReq).toBeDefined()
    expect(gqlReq.query).toBe("query { info { id } }")

    // The added REST request should exist separately
    const restReq = updatedCollection.requests.find(
      (r: any) => "endpoint" in r
    ) as any
    expect(restReq).toBeDefined()
    expect(restReq.endpoint).toBe("https://api.com/rest/info")
  })

  it("flushes dropped folders from SecretEnvironmentService and CurrentValueService when keepMissingRequests is false (Comment 3)", () => {
    const folderRefId = "test-dropped-folder-ref-id"
    const secretEnvService = getService(SecretEnvironmentService)
    const currentValueService = getService(CurrentValueService)

    // Seed local secrets and current values under the folder's _ref_id
    secretEnvService.addSecretEnvironment(folderRefId, [
      { id: "sec1", key: "API_SECRET", value: "super-secret" },
    ])
    currentValueService.addEnvironment(folderRefId, [
      {
        key: "VAR_KEY",
        currentValue: "current-val",
        varIndex: 0,
        isSecret: false,
      },
    ])

    expect(secretEnvService.secretEnvironments.has(folderRefId)).toBe(true)
    expect(currentValueService.environments.has(folderRefId)).toBe(true)

    const existing = makeCollection({
      name: "API Coll",
      folders: [
        makeCollection({
          name: "Dropped Folder",
          _ref_id: folderRefId,
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

    const incoming = [
      makeCollection({
        name: "API Coll",
        folders: [],
        requests: [],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
      }),
    ]

    mergeCollectionTree(existing, incoming, {
      preserveScripts: true,
      keepMissingRequests: false,
    })

    // The dropped folder's secret environment and current values should be deleted
    expect(secretEnvService.secretEnvironments.has(folderRefId)).toBe(false)
    expect(currentValueService.environments.has(folderRefId)).toBe(false)
  })

  it("reconciles requests tree-wide when folder is renamed without creating duplicates (Comment 4)", () => {
    const existing = makeCollection({
      name: "API Coll",
      folders: [
        makeCollection({
          name: "Users",
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
              preRequestScript: "// preserved user script",
              testScript: "// preserved user test",
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

    // OpenAPI tag was renamed from "Users" to "User Management"
    const incoming = [
      makeCollection({
        name: "API Coll",
        folders: [
          makeCollection({
            name: "User Management",
            folders: [],
            requests: [
              {
                v: "1",
                endpoint: "https://api.com/users",
                name: "Get All Users",
                method: "GET",
                auth: { authType: "inherit", authActive: true },
                headers: [{ key: "X-Version", value: "v2", active: true }],
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
      }),
    ]

    const { updatedCollection, stats } = mergeCollectionTree(
      existing,
      incoming,
      { preserveScripts: true, keepMissingRequests: true }
    )

    // Request was reconciled tree-wide from "Users" to "User Management"
    expect(stats.updatedRequests).toBe(1)
    expect(stats.addedRequests).toBe(0)
    expect(stats.preservedScripts).toBe(2)

    // User Management has the merged request with preserved scripts
    const userMgmtFolder = updatedCollection.folders.find(
      (f) => f.name === "User Management"
    )
    expect(userMgmtFolder).toBeDefined()
    expect(userMgmtFolder!.requests.length).toBe(1)
    expect((userMgmtFolder!.requests[0] as any).preRequestScript).toBe(
      "// preserved user script"
    )

    // Old "Users" folder must NOT retain a duplicate copy of the moved request
    const oldUsersFolder = updatedCollection.folders.find(
      (f) => f.name === "Users"
    )
    if (oldUsersFolder) {
      expect(oldUsersFolder.requests.length).toBe(0)
    }
  })

  it("reconciles endpoints moved between folders without creating duplicates (Comment 4)", () => {
    const existing = makeCollection({
      name: "API Coll",
      folders: [
        makeCollection({
          name: "Folder A",
          folders: [],
          requests: [
            {
              v: "1",
              endpoint: "https://api.com/moved-endpoint",
              name: "Moved Req",
              method: "POST",
              auth: { authType: "inherit", authActive: true },
              headers: [],
              params: [],
              body: { contentType: null, body: null },
              preRequestScript: "// custom script A",
              testScript: "",
            },
          ],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        }),
        makeCollection({
          name: "Folder B",
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

    // In the new version, endpoint moved from Folder A to Folder B
    const incoming = [
      makeCollection({
        name: "API Coll",
        folders: [
          makeCollection({
            name: "Folder A",
            folders: [],
            requests: [],
            auth: { authType: "inherit", authActive: true },
            headers: [],
            variables: [],
          }),
          makeCollection({
            name: "Folder B",
            folders: [],
            requests: [
              {
                v: "1",
                endpoint: "https://api.com/moved-endpoint",
                name: "Moved Req",
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
        requests: [],
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
    expect(stats.addedRequests).toBe(0)
    expect(stats.preservedScripts).toBe(1)

    const folderA = updatedCollection.folders.find(
      (f) => f.name === "Folder A"
    )!
    const folderB = updatedCollection.folders.find(
      (f) => f.name === "Folder B"
    )!

    expect(folderA.requests.length).toBe(0)
    expect(folderB.requests.length).toBe(1)
    expect((folderB.requests[0] as any).preRequestScript).toBe(
      "// custom script A"
    )
  })
})
