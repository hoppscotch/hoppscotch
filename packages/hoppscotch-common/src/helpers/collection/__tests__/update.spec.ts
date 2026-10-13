import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { makeCollection } from "@hoppscotch/data"
import {
  mergeCollectionTree,
  extractGqlOperation,
  normalizeGqlQuery,
} from "../update"
import {
  flushLocalStoresForCollectionTree,
  syncLocalStoresForCollectionUpdate,
} from "~/helpers/clientLocalVariables"
import { getService } from "~/modules/dioc"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { CurrentValueService } from "~/services/current-environment-value.service"

describe("mergeCollectionTree", () => {
  beforeEach(() => {
    const secretEnvService = getService(SecretEnvironmentService)
    const currentValueService = getService(CurrentValueService)
    secretEnvService.secretEnvironments.clear()
    currentValueService.environments.clear()
  })

  afterEach(() => {
    const secretEnvService = getService(SecretEnvironmentService)
    const currentValueService = getService(CurrentValueService)
    secretEnvService.secretEnvironments.clear()
    currentValueService.environments.clear()
  })

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

    const { deletedFolders } = mergeCollectionTree(existing, incoming, {
      preserveScripts: true,
      keepMissingRequests: false,
    })

    // Stores must NOT be deleted during merge before backend sync succeeds
    expect(secretEnvService.secretEnvironments.has(folderRefId)).toBe(true)
    expect(currentValueService.environments.has(folderRefId)).toBe(true)

    // deletedFolders must contain the dropped folder so cleanup happens after successful update
    expect(deletedFolders).toHaveLength(1)
    expect(deletedFolders[0]._ref_id).toBe(folderRefId)

    // Flushing after update deletes the stores
    deletedFolders.forEach(flushLocalStoresForCollectionTree)
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
    expect(oldUsersFolder).toBeDefined()
    expect(oldUsersFolder!.requests.length).toBe(0)
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

  it("deep-clones preserved folders and requests so they do not share object references", () => {
    const existingReq = {
      v: "1",
      endpoint: "https://api.com/existing-unique",
      name: "Existing Unique",
      method: "GET",
      auth: { authType: "inherit", authActive: true },
      headers: [],
      params: [],
      body: { contentType: null, body: null },
      preRequestScript: "",
      testScript: "",
    }
    const existingFolder = makeCollection({
      name: "Preserved Folder",
      folders: [],
      requests: [existingReq],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })
    const existing = makeCollection({
      name: "API Coll",
      folders: [existingFolder],
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

    const { updatedCollection } = mergeCollectionTree(existing, incoming, {
      preserveScripts: true,
      keepMissingRequests: true,
    })

    const preserved = updatedCollection.folders.find(
      (f) => f.name === "Preserved Folder"
    )!
    expect(preserved).toBeDefined()
    expect(preserved).not.toBe(existingFolder)
    expect(preserved.requests[0]).not.toBe(existingReq)
  })

  it("preserves path and query case when comparing REST endpoints", () => {
    const existing = makeCollection({
      name: "API Coll",
      folders: [],
      requests: [
        {
          id: "req-users-upper",
          v: "1",
          endpoint: "https://api.com/Users",
          name: "Get Users (Case Sensitive)",
          method: "GET",
          auth: { authType: "inherit", authActive: true },
          headers: [],
          params: [],
          body: { contentType: null, body: null },
          preRequestScript: "console.log('existing Users');",
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
            name: "Get users (lowercase)",
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
      {
        preserveScripts: true,
        keepMissingRequests: true,
      }
    )

    // /Users and /users must NOT match as the same endpoint
    expect(stats.addedRequests).toBe(1)
    expect(stats.preservedRequests).toBe(1)
    expect(updatedCollection.requests).toHaveLength(2)

    const preserved = updatedCollection.requests.find(
      (r: any) => r.endpoint === "https://api.com/Users"
    )
    const added = updatedCollection.requests.find(
      (r: any) => r.endpoint === "https://api.com/users"
    )
    expect(preserved?.id).toBe("req-users-upper")
    expect(preserved?.preRequestScript).toBe("console.log('existing Users');")
    expect(added?.id).toBeUndefined()
  })

  it("distinguishes GraphQL operations sharing the same URL without swapping scripts", () => {
    const existing = makeCollection({
      name: "GQL Coll",
      folders: [],
      requests: [
        {
          id: "gql-get-user",
          name: "GetUser",
          url: "https://api.com/graphql",
          query: "query GetUser { user { id name } }",
          headers: [],
          variables: "{}",
          auth: { authType: "inherit", authActive: true },
          preRequestScript: "console.log('script A - get user');",
          testScript: "",
        } as any,
        {
          id: "gql-update-user",
          name: "UpdateUser",
          url: "https://api.com/graphql",
          query: "mutation UpdateUser { updateUser { id } }",
          headers: [],
          variables: "{}",
          auth: { authType: "inherit", authActive: true },
          preRequestScript: "console.log('script B - update user');",
          testScript: "",
        } as any,
      ],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    // Incoming reverses the two operations at the same URL
    const incoming = [
      makeCollection({
        name: "GQL Coll",
        folders: [],
        requests: [
          {
            name: "UpdateUser",
            url: "https://api.com/graphql",
            query: "mutation UpdateUser { updateUser { id } }",
            headers: [],
            variables: "{}",
            auth: { authType: "inherit", authActive: true },
            preRequestScript: "",
            testScript: "",
          } as any,
          {
            name: "GetUser",
            url: "https://api.com/graphql",
            query: "query GetUser { user { id name } }",
            headers: [],
            variables: "{}",
            auth: { authType: "inherit", authActive: true },
            preRequestScript: "",
            testScript: "",
          } as any,
        ],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
      }),
    ]

    const { updatedCollection } = mergeCollectionTree(existing, incoming, {
      preserveScripts: true,
      keepMissingRequests: true,
    })

    const updatedUpdateUser = updatedCollection.requests.find(
      (r) => r.name === "UpdateUser"
    )
    const updatedGetUser = updatedCollection.requests.find(
      (r) => r.name === "GetUser"
    )

    // IDs and preserved scripts must belong to the correct operation, not swapped
    expect(updatedUpdateUser?.id).toBe("gql-update-user")
    expect(updatedUpdateUser?.preRequestScript).toBe(
      "console.log('script B - update user');"
    )

    expect(updatedGetUser?.id).toBe("gql-get-user")
    expect(updatedGetUser?.preRequestScript).toBe(
      "console.log('script A - get user');"
    )
  })

  it("preserves scripts when multiple incoming collections are merged", () => {
    const existing = makeCollection({
      name: "API Coll",
      folders: [
        makeCollection({
          name: "Users",
          folders: [],
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
              preRequestScript: "console.log('preserve me');",
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

    // Multiple incoming collections (e.g. OpenAPI tags)
    const incoming = [
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
            preRequestScript: "",
            testScript: "",
          },
        ],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
      }),
      makeCollection({
        name: "Posts",
        folders: [],
        requests: [
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
      {
        preserveScripts: true,
        keepMissingRequests: true,
      }
    )

    expect(stats.preservedScripts).toBe(1)
    const usersFolder = updatedCollection.folders.find(
      (f) => f.name === "Users"
    )
    expect(usersFolder).toBeDefined()
    const usersReq = usersFolder?.requests.find((r) => r.name === "Get Users")
    expect(usersReq?.id).toBe("existing-req-id")
    expect(usersReq?.preRequestScript).toBe("console.log('preserve me');")
  })

  it("syncLocalStoresForCollectionUpdate preserves local secrets and current values for retained nodes", () => {
    const secretEnvService = getService(SecretEnvironmentService)
    const currentValueService = getService(CurrentValueService)

    const rootRefId = "root-ref-id"
    const original = makeCollection({
      _ref_id: rootRefId,
      name: "API Coll",
      folders: [],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [
        {
          key: "API_SECRET",
          value: "",
          initialValue: "",
          secret: true,
        } as any,
        {
          key: "BASE_URL",
          value: "https://default.com",
          initialValue: "https://default.com",
          secret: false,
        } as any,
      ],
    })

    // Seed local stores with user's saved secret and current value
    secretEnvService.addSecretEnvironment(rootRefId, [
      {
        key: "API_SECRET",
        value: "my-top-secret-token",
        initialValue: "",
        varIndex: 0,
      },
    ])
    currentValueService.addEnvironment(rootRefId, [
      {
        key: "BASE_URL",
        currentValue: "https://custom-environment.com",
        varIndex: 1,
        isSecret: false,
      },
    ])

    const incomingNoVars = [
      makeCollection({
        name: "API Coll",
        folders: [],
        requests: [],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
      }),
    ]

    const { updatedCollection, incomingHadVariablesMap } = mergeCollectionTree(
      original,
      incomingNoVars,
      { preserveScripts: true, keepMissingRequests: true }
    )

    // Call syncLocalStoresForCollectionUpdate
    syncLocalStoresForCollectionUpdate(
      original,
      updatedCollection,
      incomingHadVariablesMap
    )

    // Local stores must be completely preserved
    const secret = secretEnvService.getSecretEnvironmentVariableValue(
      rootRefId,
      0
    )
    expect(secret?.value).toBe("my-top-secret-token")

    const currVal = currentValueService.getEnvironmentVariableValue(
      rootRefId,
      1
    )
    expect(currVal).toBe("https://custom-environment.com")
  })

  it("preserves credentials in REST endpoints without swapping scripts on re-import", () => {
    const existing = makeCollection({
      name: "Accounts API",
      folders: [],
      requests: [
        {
          id: "alice-id",
          v: "1",
          endpoint: "https://alice:pw@api.example.com/me",
          name: "Alice Profile",
          method: "GET",
          auth: { authType: "inherit", authActive: true },
          headers: [],
          params: [],
          body: { contentType: null, body: null },
          preRequestScript: "// alice script",
          testScript: "// alice test",
        },
        {
          id: "bob-id",
          v: "1",
          endpoint: "https://bob:pw@api.example.com/me",
          name: "Bob Profile",
          method: "GET",
          auth: { authType: "inherit", authActive: true },
          headers: [],
          params: [],
          body: { contentType: null, body: null },
          preRequestScript: "// bob script",
          testScript: "// bob test",
        },
      ],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    // Incoming with reversed order
    const incoming = [
      makeCollection({
        name: "Accounts API",
        folders: [],
        requests: [
          {
            v: "1",
            endpoint: "https://bob:pw@api.example.com/me",
            name: "Bob Profile (Updated)",
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
            endpoint: "https://alice:pw@api.example.com/me",
            name: "Alice Profile (Updated)",
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

    expect(stats.preservedScripts).toBe(4)
    const aliceReq = updatedCollection.requests.find((r) =>
      (r as any).endpoint?.includes("alice:pw")
    )
    const bobReq = updatedCollection.requests.find((r) =>
      (r as any).endpoint?.includes("bob:pw")
    )

    expect(aliceReq?.id).toBe("alice-id")
    expect((aliceReq as any).preRequestScript).toBe("// alice script")
    expect((aliceReq as any).testScript).toBe("// alice test")

    expect(bobReq?.id).toBe("bob-id")
    expect((bobReq as any).preRequestScript).toBe("// bob script")
    expect((bobReq as any).testScript).toBe("// bob test")
  })

  it("syncLocalStoresForCollectionUpdate preserves distinct saved values for repeated variable names", () => {
    const secretEnvService = getService(SecretEnvironmentService)
    const currentValueService = getService(CurrentValueService)

    const rootRefId = "root-repeated-vars"
    const original = makeCollection({
      _ref_id: rootRefId,
      name: "Repeated Vars Coll",
      folders: [],
      requests: [],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [
        {
          key: "API_KEY",
          value: "",
          initialValue: "",
          secret: true,
        } as any,
        {
          key: "API_KEY",
          value: "",
          initialValue: "",
          secret: true,
        } as any,
        {
          key: "ENV",
          value: "default-env-1",
          initialValue: "default-env-1",
          secret: false,
        } as any,
        {
          key: "ENV",
          value: "default-env-2",
          initialValue: "default-env-2",
          secret: false,
        } as any,
      ],
    })

    // Seed distinct local values per varIndex
    secretEnvService.addSecretEnvironment(rootRefId, [
      {
        key: "API_KEY",
        value: "secret-token-one",
        initialValue: "",
        varIndex: 0,
      },
      {
        key: "API_KEY",
        value: "secret-token-two",
        initialValue: "",
        varIndex: 1,
      },
    ])

    currentValueService.addEnvironment(rootRefId, [
      {
        key: "ENV",
        currentValue: "production",
        varIndex: 2,
        isSecret: false,
      },
      {
        key: "ENV",
        currentValue: "staging",
        varIndex: 3,
        isSecret: false,
      },
    ])

    // Incoming collection has the exact same repeated variables
    const incoming = [
      makeCollection({
        name: "Repeated Vars Coll",
        folders: [],
        requests: [],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [
          {
            key: "API_KEY",
            value: "",
            initialValue: "",
            secret: true,
          } as any,
          {
            key: "API_KEY",
            value: "",
            initialValue: "",
            secret: true,
          } as any,
          {
            key: "ENV",
            value: "default-env-1",
            initialValue: "default-env-1",
            secret: false,
          } as any,
          {
            key: "ENV",
            value: "default-env-2",
            initialValue: "default-env-2",
            secret: false,
          } as any,
        ],
      }),
    ]

    const { updatedCollection, incomingHadVariablesMap } = mergeCollectionTree(
      original,
      incoming,
      { preserveScripts: true, keepMissingRequests: true }
    )

    syncLocalStoresForCollectionUpdate(
      original,
      updatedCollection,
      incomingHadVariablesMap
    )

    // Verify occurrence 0 has secret-token-one, occurrence 1 has secret-token-two
    const secret0 = secretEnvService.getSecretEnvironmentVariableValue(
      rootRefId,
      0
    )
    const secret1 = secretEnvService.getSecretEnvironmentVariableValue(
      rootRefId,
      1
    )
    expect(secret0?.value).toBe("secret-token-one")
    expect(secret1?.value).toBe("secret-token-two")

    // Verify occurrence 2 has production, occurrence 3 has staging
    const curr2 = currentValueService.getEnvironmentVariableValue(rootRefId, 2)
    const curr3 = currentValueService.getEnvironmentVariableValue(rootRefId, 3)
    expect(curr2).toBe("production")
    expect(curr3).toBe("staging")
  })

  it("distinguishes GraphQL operations by operation kind and case", () => {
    expect(extractGqlOperation("query GetUser { me }")).toBe("query:GetUser")
    expect(extractGqlOperation("mutation GetUser { me }")).toBe(
      "mutation:GetUser"
    )
    expect(extractGqlOperation("subscription GetUser { me }")).toBe(
      "subscription:GetUser"
    )
    expect(extractGqlOperation("query getUser { me }")).toBe("query:getUser")
  })

  it("normalizes insignificant GraphQL whitespace while preserving string literal whitespace", () => {
    const queryA = 'query { field(arg: "a  b") }'
    const queryB = 'query { field(arg: "a b") }'

    expect(normalizeGqlQuery(queryA)).not.toBe(normalizeGqlQuery(queryB))

    const multilineWithComments = `
      query {
        # comment
        user,
        name
      }
    `
    expect(normalizeGqlQuery(multilineWithComments)).toBe("query { user name }")
  })

  it("does not match GraphQL requests on ambiguous duplicate display names with different queries", () => {
    const existing = makeCollection({
      name: "GQL Coll",
      folders: [],
      requests: [
        {
          id: "req-users",
          name: "New Request",
          url: "https://api.com/graphql",
          query: "query GetUsers { users { id } }",
          variables: "{}",
          headers: [],
          auth: { authType: "inherit", authActive: true },
          preRequestScript: "// users script",
          testScript: "// users test",
        } as any,
        {
          id: "req-orders",
          name: "New Request",
          url: "https://api.com/graphql",
          query: "query GetOrders { orders { id } }",
          variables: "{}",
          headers: [],
          auth: { authType: "inherit", authActive: true },
          preRequestScript: "// orders script",
          testScript: "// orders test",
        } as any,
      ],
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    })

    // Incoming has them in reverse order, still both named "New Request"
    const incoming = [
      makeCollection({
        name: "GQL Coll",
        folders: [],
        requests: [
          {
            name: "New Request",
            url: "https://api.com/graphql",
            query: "query GetOrders { orders { id } }",
            variables: "{}",
            headers: [],
            auth: { authType: "inherit", authActive: true },
            preRequestScript: "",
            testScript: "",
          } as any,
          {
            name: "New Request",
            url: "https://api.com/graphql",
            query: "query GetUsers { users { id } }",
            variables: "{}",
            headers: [],
            auth: { authType: "inherit", authActive: true },
            preRequestScript: "",
            testScript: "",
          } as any,
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

    expect(stats.preservedScripts).toBe(4)
    const ordersReq = updatedCollection.requests.find((r) =>
      (r as any).query?.includes("GetOrders")
    )
    const usersReq = updatedCollection.requests.find((r) =>
      (r as any).query?.includes("GetUsers")
    )

    expect(ordersReq?.id).toBe("req-orders")
    expect((ordersReq as any).preRequestScript).toBe("// orders script")
    expect((ordersReq as any).testScript).toBe("// orders test")

    expect(usersReq?.id).toBe("req-users")
    expect((usersReq as any).preRequestScript).toBe("// users script")
    expect((usersReq as any).testScript).toBe("// users test")
  })
})
