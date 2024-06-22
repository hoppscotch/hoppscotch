import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest"
import {
  sortByOrder,
  TeamsWorkspaceProviderService,
} from "./../teams.workspace"
import * as E from "fp-ts/Either"
import { TestContainer } from "dioc/testing"
import {
  createChildCollection,
  createNewRootCollection,
  updateTeamCollection,
  deleteCollection,
  moveRESTTeamCollection,
  updateOrderRESTTeamCollection,
} from "~/helpers/backend/mutations/TeamCollection"

import * as TE from "fp-ts/TaskEither"
import { fetchAllTeams } from "~/helpers/teams/TeamListAdapter"
import {
  CreateNewRootCollectionMutation,
  CreateRequestInCollectionMutation,
  DeleteCollectionMutation,
  GetCollectionChildrenQuery,
  GetCollectionRequestsQuery,
  GetMyTeamsQuery,
  MoveRestTeamCollectionMutation,
  MoveRestTeamRequestMutation,
  RootCollectionsOfTeamQuery,
  UpdateCollectionOrderMutation,
  UpdateLookUpRequestOrderMutation,
  UpdateRequestMutation,
  UpdateTeamCollectionMutation,
} from "~/helpers/backend/graphql"
import { Handle } from "../../handle"
import { Workspace, WorkspaceCollection } from "../../workspace"
import {
  createRequestInCollection,
  updateTeamRequest,
  deleteTeamRequest,
  moveRESTTeamRequest,
  updateOrderRESTTeamRequest,
} from "~/helpers/backend/mutations/TeamRequest"
import {
  getDefaultRESTRequest,
  HoppCollection,
  HoppRESTAuth,
  HoppRESTHeader,
} from "@hoppscotch/data"
import {
  getCollectionChildren,
  getCollectionChildRequests,
  getRootCollections,
} from "~/helpers/backend/helpers"
import { toRaw, watch } from "vue"
import { initializeDownloadFile } from "~/helpers/import-export/export"

vi.mock("./../../../../platform", () => {
  const actual = vi.importActual("./../../../../platform")

  return {
    platform: {
      ...actual,
      analytics: {
        logEvent: vi.fn(),
      },
    },
  }
})

vi.mock("./../../../../helpers/backend/mutations/TeamCollection", () => {
  return {
    createNewRootCollection: vi.fn(),
    createChildCollection: vi.fn(),
    updateTeamCollection: vi.fn(),
    deleteCollection: vi.fn(),
    moveRESTTeamCollection: vi.fn(),
    updateOrderRESTTeamCollection: vi.fn(),
  }
})

vi.mock("./../../../../helpers/backend/mutations/TeamRequest", () => {
  return {
    createRequestInCollection: vi.fn(),
    updateTeamRequest: vi.fn(),
    deleteTeamRequest: vi.fn(),
    moveRESTTeamRequest: vi.fn(),
    updateOrderRESTTeamRequest: vi.fn(),
  }
})

vi.mock("./../../../../helpers/teams/TeamListAdapter", () => {
  return {
    fetchAllTeams: vi.fn(),
  }
})

vi.mock("./../../../../helpers/backend/helpers", () => {
  return {
    getCollectionChildren: vi.fn(),
    getCollectionChildRequests: vi.fn(),
    getRootCollections: vi.fn(),
  }
})

vi.mock("./../../../../helpers/import-export/export", () => {
  return {
    initializeDownloadFile: vi.fn(),
  }
})

describe("TeamsWorkspaceProviderService", () => {
  beforeAll(() => {
    vi.mocked(createNewRootCollection).mockReset()
    vi.mocked(createChildCollection).mockReset()
    vi.mocked(updateTeamCollection).mockReset()
    vi.mocked(fetchAllTeams).mockReset()
  })

  test("can create a root collection", async () => {
    mockFetchAllTeams()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const workspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    const collection = await createSampleRootCollectionForTesting(
      workspace,
      teamsWorkspaceProviderService
    )

    const collectionValue = collection.get()

    expect(collectionValue.value).toMatchInlineSnapshot(`
      {
        "data": {
          "collectionID": "root_collection_id_0",
          "name": "Test Collection #0",
          "providerID": "TEAMS_WORKSPACE_PROVIDER",
          "workspaceID": "workspace_id_0",
        },
        "type": "ok",
      }
    `)
  })

  test("can create a child collection", async () => {
    mockFetchAllTeams()
    mockGetCollectionChildren()
    mockGetCollectionChildRequests()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    const collection = await createSampleRootCollectionForTesting(
      sampleWorkspace,
      teamsWorkspaceProviderService
    )

    const childCollection = await createSampleChildCollectionForTesting(
      collection,
      teamsWorkspaceProviderService
    )

    const childCollectionHandleRef = childCollection.get()

    expect(childCollectionHandleRef.value).toMatchInlineSnapshot(`
      {
        "data": {
          "collectionID": "child_collection_id_0",
          "name": "Test Child Collection #0",
          "providerID": "TEAMS_WORKSPACE_PROVIDER",
          "workspaceID": "workspace_id_0",
        },
        "type": "ok",
      }
    `)

    const children =
      await teamsWorkspaceProviderService.getRESTCollectionChildrenView(
        collection
      )

    if (E.isLeft(children)) {
      console.log(children.left)
      throw new Error("FAILED_TO_GET_CHILDREN")
    }

    const childrenHandle = children.right.get()

    if (childrenHandle.value.type === "invalid") {
      throw new Error("INVALID_CHILD_COLLECTION_HANDLE")
    }

    expect(toRaw(childrenHandle.value.data.content.value))
      .toMatchInlineSnapshot(`
        [
          {
            "type": "collection",
            "value": {
              "collectionID": "child_collection_id_0",
              "isLastItem": true,
              "name": "Test Child Collection #0",
              "parentCollectionID": "root_collection_id_0",
            },
          },
        ]
      `)
  })

  test("can update a collection", async () => {
    mockFetchAllTeams()
    mockUpdateTeamCollection()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    const collection = await createSampleRootCollectionForTesting(
      sampleWorkspace,
      teamsWorkspaceProviderService
    )

    const collectionHandle = collection.get()

    const updatedCollection =
      await teamsWorkspaceProviderService.updateRESTCollection(collection, {
        name: "Collection #0 - Updated",
      })

    if (E.isLeft(updatedCollection)) {
      console.log(updatedCollection.left)
      throw new Error("FAILED_TO_UPDATE_COLLECTION")
    }

    expect(collectionHandle.value).toMatchInlineSnapshot(`
      {
        "data": {
          "collectionID": "root_collection_id_0",
          "name": "Collection #0 - Updated",
          "providerID": "TEAMS_WORKSPACE_PROVIDER",
          "workspaceID": "workspace_id_0",
        },
        "type": "ok",
      }
    `)
  })

  test("can create a request in a collection", async () => {
    mockFetchAllTeams()
    mockCreateRequestInCollection()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    const collection = await createSampleRootCollectionForTesting(
      sampleWorkspace,
      teamsWorkspaceProviderService
    )

    const request = await teamsWorkspaceProviderService.createRESTRequest(
      collection,
      {
        ...getDefaultRESTRequest(),
        name: "Test Request #0",
      }
    )

    if (E.isLeft(request)) {
      console.log(request.left)
      throw new Error("FAILED_TO_CREATE_REQUEST")
    }

    expect(request.right.get().value).toMatchInlineSnapshot(`
      {
        "data": {
          "collectionID": "root_collection_id_0",
          "providerID": "TEAMS_WORKSPACE_PROVIDER",
          "request": {
            "auth": {
              "authActive": true,
              "authType": "none",
            },
            "body": {
              "body": null,
              "contentType": null,
            },
            "endpoint": "https://echo.hoppscotch.io",
            "headers": [],
            "method": "GET",
            "name": "Test Request #0",
            "params": [],
            "preRequestScript": "",
            "testScript": "",
            "v": "1",
          },
          "requestID": "request_id_0",
          "workspaceID": "workspace_id_0",
        },
        "type": "ok",
      }
    `)
  })

  test("can update a request in a collection", async () => {
    mockFetchAllTeams()
    mockCreateRequestInCollection()
    mockUpdateTeamRequest()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    const collection = await createSampleRootCollectionForTesting(
      sampleWorkspace,
      teamsWorkspaceProviderService
    )

    const request = await teamsWorkspaceProviderService.createRESTRequest(
      collection,
      {
        ...getDefaultRESTRequest(),
        name: "Test Request #0",
      }
    )

    if (E.isLeft(request)) {
      throw new Error("FAILED_TO_CREATE_REQUEST")
    }

    const requestHandle = request.right.get()

    const updatedRequest =
      await teamsWorkspaceProviderService.updateRESTRequest(request.right, {
        name: "Request #0 - Updated",
      })

    if (E.isLeft(updatedRequest)) {
      console.log(updatedRequest.left)
      throw new Error("FAILED_TO_UPDATE_REQUEST")
    }

    expect(requestHandle.value).toMatchInlineSnapshot(`
      {
        "data": {
          "collectionID": "root_collection_id_0",
          "providerID": "TEAMS_WORKSPACE_PROVIDER",
          "request": {
            "auth": {
              "authActive": true,
              "authType": "none",
            },
            "body": {
              "body": null,
              "contentType": null,
            },
            "endpoint": "https://echo.hoppscotch.io",
            "headers": [],
            "method": "GET",
            "name": "Request #0 - Updated",
            "params": [],
            "preRequestScript": "",
            "testScript": "",
            "v": "1",
          },
          "requestID": "request_id_0",
          "workspaceID": "workspace_id_0",
        },
        "type": "ok",
      }
    `)
  })

  test("remove a collection", async () => {
    mockFetchAllTeams()
    mockDeleteRestCollection()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    const collection = await createSampleRootCollectionForTesting(
      sampleWorkspace,
      teamsWorkspaceProviderService
    )

    const collectionHandle = collection.get()

    expect(collectionHandle.value).toMatchInlineSnapshot(`
      {
        "data": {
          "collectionID": "root_collection_id_0",
          "name": "Test Collection #0",
          "providerID": "TEAMS_WORKSPACE_PROVIDER",
          "workspaceID": "workspace_id_0",
        },
        "type": "ok",
      }
    `)

    const deletedCollection =
      await teamsWorkspaceProviderService.removeRESTCollection(collection)

    if (E.isLeft(deletedCollection)) {
      console.log(deletedCollection.left)
      throw new Error("FAILED_TO_DELETE_COLLECTION")
    }

    expect(collectionHandle.value).toMatchInlineSnapshot(`
      {
        "reason": "COLLECTION_DOES_NOT_EXIST",
        "type": "invalid",
      }
    `)
  })

  test("remove rest request", async () => {
    mockFetchAllTeams()
    mockCreateRequestInCollection()
    mockDeleteRestRequest()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    const collection = await createSampleRootCollectionForTesting(
      sampleWorkspace,
      teamsWorkspaceProviderService
    )

    const request = await teamsWorkspaceProviderService.createRESTRequest(
      collection,
      {
        ...getDefaultRESTRequest(),
        name: "Test Request #0",
      }
    )

    if (E.isLeft(request)) {
      throw new Error("FAILED_TO_CREATE_REQUEST")
    }

    const requestHandle = request.right.get()

    expect(requestHandle.value).toMatchInlineSnapshot(`
      {
        "data": {
          "collectionID": "root_collection_id_0",
          "providerID": "TEAMS_WORKSPACE_PROVIDER",
          "request": {
            "auth": {
              "authActive": true,
              "authType": "none",
            },
            "body": {
              "body": null,
              "contentType": null,
            },
            "endpoint": "https://echo.hoppscotch.io",
            "headers": [],
            "method": "GET",
            "name": "Test Request #0",
            "params": [],
            "preRequestScript": "",
            "testScript": "",
            "v": "1",
          },
          "requestID": "request_id_0",
          "workspaceID": "workspace_id_0",
        },
        "type": "ok",
      }
    `)

    const deletedRequest =
      await teamsWorkspaceProviderService.removeRESTRequest(request.right)

    if (E.isLeft(deletedRequest)) {
      console.log(deletedRequest.left)
      throw new Error("FAILED_TO_DELETE_REQUEST")
    }

    expect(requestHandle.value).toMatchInlineSnapshot(`
      {
        "reason": "REQUEST_DOES_NOT_EXIST",
        "type": "invalid",
      }
    `)
  })

  test("get child collections and requests of a collection", async () => {
    mockFetchAllTeams()
    mockGetCollectionChildren()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    const collection = await createSampleRootCollectionForTesting(
      sampleWorkspace,
      teamsWorkspaceProviderService
    )

    // insert one child collection
    await createSampleChildCollectionForTesting(
      collection,
      teamsWorkspaceProviderService
    )

    const children =
      await teamsWorkspaceProviderService.getRESTCollectionChildrenView(
        collection
      )

    if (E.isLeft(children)) {
      console.log(children.left)
      throw new Error("FAILED_TO_GET_CHILDREN")
    }

    const childrenHandle = children.right.get()

    if (childrenHandle.value.type === "invalid") {
      throw new Error("INVALID_CHILD_COLLECTION_HANDLE")
    }

    // locally we've one child collection. when we call getRESTCollectionChildrenView, we should get a computed with that one child collection
    expect(childrenHandle.value.data.content.value).toMatchInlineSnapshot(`
      [
        {
          "type": "collection",
          "value": {
            "collectionID": "child_collection_id_0",
            "isLastItem": true,
            "name": "Test Child Collection #0",
            "parentCollectionID": "root_collection_id_0",
          },
        },
      ]
    `)

    // verify the loading state and other properties
    expect({
      collectionID: childrenHandle.value.data.collectionID,
      loading: childrenHandle.value.data.loading.value,
      providerID: childrenHandle.value.data.providerID,
      workspaceID: childrenHandle.value.data.workspaceID,
    }).toMatchInlineSnapshot(`
      {
        "collectionID": "root_collection_id_0",
        "loading": true,
        "providerID": "TEAMS_WORKSPACE_PROVIDER",
        "workspaceID": "workspace_id_0",
      }
    `)

    let resolve: (value: undefined) => void

    const promise = new Promise<void>((res) => {
      resolve = res
    })

    // wait for the value of childrenHandle to change
    watch(childrenHandle, () => {
      resolve(undefined)
    })

    await promise

    // verify the computed value after the getChildren is resolved, here we've mocked it to return 3 child collections
    expect(childrenHandle.value.data.content.value).toMatchInlineSnapshot(`
      [
        {
          "type": "collection",
          "value": {
            "collectionID": "child_collection_id_0",
            "isLastItem": false,
            "name": "Test Child Collection #0",
            "parentCollectionID": "root_collection_id_0",
          },
        },
        {
          "type": "collection",
          "value": {
            "collectionID": "child_collection_id_1",
            "isLastItem": false,
            "name": "Test Child Collection #1",
            "parentCollectionID": "root_collection_id_0",
          },
        },
        {
          "type": "collection",
          "value": {
            "collectionID": "child_collection_id_2",
            "isLastItem": true,
            "name": "Test Child Collection #2",
            "parentCollectionID": "root_collection_id_0",
          },
        },
        {
          "type": "request",
          "value": {
            "collectionID": "root_collection_id_0",
            "isLastItem": false,
            "request": {
              "auth": {
                "authActive": true,
                "authType": "none",
              },
              "body": {
                "body": null,
                "contentType": null,
              },
              "endpoint": "https://echo.hoppscotch.io",
              "headers": [],
              "method": "GET",
              "name": "Untitled",
              "params": [],
              "preRequestScript": "",
              "testScript": "",
              "v": "1",
            },
            "requestID": "request_id_0",
          },
        },
        {
          "type": "request",
          "value": {
            "collectionID": "root_collection_id_0",
            "isLastItem": false,
            "request": {
              "auth": {
                "authActive": true,
                "authType": "none",
              },
              "body": {
                "body": null,
                "contentType": null,
              },
              "endpoint": "https://echo.hoppscotch.io",
              "headers": [],
              "method": "GET",
              "name": "Untitled",
              "params": [],
              "preRequestScript": "",
              "testScript": "",
              "v": "1",
            },
            "requestID": "request_id_1",
          },
        },
        {
          "type": "request",
          "value": {
            "collectionID": "root_collection_id_0",
            "isLastItem": true,
            "request": {
              "auth": {
                "authActive": true,
                "authType": "none",
              },
              "body": {
                "body": null,
                "contentType": null,
              },
              "endpoint": "https://echo.hoppscotch.io",
              "headers": [],
              "method": "GET",
              "name": "Untitled",
              "params": [],
              "preRequestScript": "",
              "testScript": "",
              "v": "1",
            },
            "requestID": "request_id_2",
          },
        },
      ]
    `)

    // verify the loading state and other properties
    expect({
      collectionID: childrenHandle.value.data.collectionID,
      loading: childrenHandle.value.data.loading.value,
      providerID: childrenHandle.value.data.providerID,
      workspaceID: childrenHandle.value.data.workspaceID,
    }).toMatchInlineSnapshot(`
      {
        "collectionID": "root_collection_id_0",
        "loading": false,
        "providerID": "TEAMS_WORKSPACE_PROVIDER",
        "workspaceID": "workspace_id_0",
      }
    `)
  })

  test("get rest root collections of a workspace", async () => {
    mockFetchAllTeams()
    mockGetRootCollections()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    const collection = await createSampleRootCollectionForTesting(
      sampleWorkspace,
      teamsWorkspaceProviderService
    )

    // also create a child collection to make sure we fetch the root collections only
    await createSampleChildCollectionForTesting(
      collection,
      teamsWorkspaceProviderService
    )

    const rootCollections =
      await teamsWorkspaceProviderService.getRESTRootCollectionView(
        sampleWorkspace
      )

    if (E.isLeft(rootCollections)) {
      console.log(rootCollections.left)
      throw new Error("FAILED_TO_GET_ROOT_COLLECTIONS")
    }

    const rootCollectionsHandle = rootCollections.right.get()

    if (rootCollectionsHandle.value.type === "invalid") {
      throw new Error("INVALID_ROOT_COLLECTION_HANDLE")
    }

    const rootCollectionsContent = rootCollectionsHandle.value.data.collections

    expect({
      collections: rootCollectionsContent.value,
      loading: rootCollectionsHandle.value.data.loading.value,
      providerID: rootCollectionsHandle.value.data.providerID,
      workspaceID: rootCollectionsHandle.value.data.workspaceID,
    }).toMatchInlineSnapshot(`
      {
        "collections": [
          {
            "collectionID": "root_collection_id_0",
            "isLastItem": true,
            "name": "Test Collection #0",
            "parentCollectionID": null,
          },
        ],
        "loading": true,
        "providerID": "TEAMS_WORKSPACE_PROVIDER",
        "workspaceID": "workspace_id_0",
      }
    `)

    let resolve: (value: undefined) => void

    const promise = new Promise<void>((res) => {
      resolve = res
    })

    // wait for the value of rootCollectionsHandle to change
    watch(
      rootCollectionsHandle,
      () => {
        resolve(undefined)
      },
      {
        deep: true,
      }
    )

    await promise

    expect({
      collections: rootCollectionsContent.value,
      loading: rootCollectionsHandle.value.data.loading.value,
      providerID: rootCollectionsHandle.value.data.providerID,
      workspaceID: rootCollectionsHandle.value.data.workspaceID,
    }).toMatchInlineSnapshot(`
      {
        "collections": [
          {
            "collectionID": "root_collection_id_0",
            "isLastItem": false,
            "name": "Test Collection #0",
            "parentCollectionID": null,
          },
          {
            "collectionID": "root_collection_id_0",
            "isLastItem": false,
            "name": "Test Collection #0",
            "parentCollectionID": null,
          },
          {
            "collectionID": "root_collection_id_1",
            "isLastItem": false,
            "name": "Test Collection #1",
            "parentCollectionID": null,
          },
          {
            "collectionID": "root_collection_id_2",
            "isLastItem": true,
            "name": "Test Collection #2",
            "parentCollectionID": null,
          },
        ],
        "loading": false,
        "providerID": "TEAMS_WORKSPACE_PROVIDER",
        "workspaceID": "workspace_id_0",
      }
    `)
  })

  test("get collection level auth headers view", async () => {
    mockFetchAllTeams()

    mockGetCollectionChildren({
      root_collection_id_0: [
        {
          id: "child_collection_id_0",
          title: "Test Child Collection #0",
          data: JSON.stringify({
            auth: {
              authType: "inherit",
              authActive: true,
            },
            headers: [],
          }),
        },
      ],
      child_collection_id_0: [
        {
          id: "child_collection_id_0_0",
          title: "Test Child Collection #0",
          data: JSON.stringify({
            auth: {
              authType: "inherit",
              authActive: true,
            },
            headers: [],
          }),
        },
      ],
    })

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    teamsWorkspaceProviderService._setCollections([
      {
        collectionID: "root_collection_id_0",
        name: "Test Collection #0",
        auth: {
          authType: "basic",
          username: "test_username",
          password: "test_password",
          authActive: true,
        },
        headers: [
          {
            key: "X-Test-Header",
            value: "TESTING_ROOT_COLLECTION_HEADER_INHERITENCE",
            active: true,
          },
        ],
        order: "a0",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
      },
      {
        collectionID: "child_collection_id_0",
        name: "Test Child Collection #0",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a1",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "root_collection_id_0",
      },
      {
        collectionID: "child_collection_id_0_0",
        name: "Test Nested Child Collection #0",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a1.1",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "child_collection_id_0",
      },
      {
        collectionID: "child_collection_id_1",
        name: "Test Child Collection #1",
        auth: {
          authType: "api-key",
          addTo: "header",
          key: "API_KEY",
          authActive: true,
          value: "FAKE_API_KEY",
        },
        headers: [
          {
            key: "X-Test-Another-Header",
            value: "TESTING_CHILD_COLLECTION_HEADER_INHERITENCE",
            active: true,
          },
        ],
        order: "a2",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "root_collection_id_0",
      },
      {
        collectionID: "child_collection_id_1_0",
        name: "Test Nested Child Collection #1",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a2.1",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "child_collection_id_1",
      },
    ])

    const nestedChildCollection =
      await teamsWorkspaceProviderService.getCollectionHandle(
        sampleWorkspace,
        "child_collection_id_0_0"
      )

    const anotherNestedChildCollection =
      await teamsWorkspaceProviderService.getCollectionHandle(
        sampleWorkspace,
        "child_collection_id_1_0"
      )

    if (E.isLeft(nestedChildCollection)) {
      throw new Error("FAILED_TO_GET_NESTED_CHILD_COLLECTION")
    }

    if (E.isLeft(anotherNestedChildCollection)) {
      throw new Error("FAILED_TO_GET_ANOTHER_NESTED_CHILD_COLLECTION")
    }

    const authHeadersViewFromRootCollection =
      await teamsWorkspaceProviderService.getRESTCollectionLevelAuthHeadersView(
        nestedChildCollection.right
      )

    if (E.isLeft(authHeadersViewFromRootCollection)) {
      throw new Error("FAILED_TO_GET_AUTH_HEADERS")
    }

    expect(authHeadersViewFromRootCollection.right.get().value)
      .toMatchInlineSnapshot(`
        {
          "data": {
            "auth": {
              "inheritedAuth": {
                "authActive": true,
                "authType": "basic",
                "password": "test_password",
                "username": "test_username",
              },
              "parentID": "root_collection_id_0",
              "parentName": "Test Collection #0",
            },
            "headers": [
              {
                "inheritedHeader": {
                  "active": true,
                  "key": "X-Test-Header",
                  "value": "TESTING_ROOT_COLLECTION_HEADER_INHERITENCE",
                },
                "parentID": "root_collection_id_0",
                "parentName": "Test Collection #0",
              },
            ],
          },
          "type": "ok",
        }
      `)

    const authHeadersViewFromChildCollection =
      await teamsWorkspaceProviderService.getRESTCollectionLevelAuthHeadersView(
        anotherNestedChildCollection.right
      )

    if (E.isLeft(authHeadersViewFromChildCollection)) {
      throw new Error("FAILED_TO_GET_AUTH_HEADERS")
    }

    expect(authHeadersViewFromChildCollection.right.get().value)
      .toMatchInlineSnapshot(`
        {
          "data": {
            "auth": {
              "inheritedAuth": {
                "addTo": "header",
                "authActive": true,
                "authType": "api-key",
                "key": "API_KEY",
                "value": "FAKE_API_KEY",
              },
              "parentID": "child_collection_id_1",
              "parentName": "Test Child Collection #1",
            },
            "headers": [
              {
                "inheritedHeader": {
                  "active": true,
                  "key": "X-Test-Another-Header",
                  "value": "TESTING_CHILD_COLLECTION_HEADER_INHERITENCE",
                },
                "parentID": "child_collection_id_1",
                "parentName": "Test Child Collection #1",
              },
              {
                "inheritedHeader": {
                  "active": true,
                  "key": "X-Test-Header",
                  "value": "TESTING_ROOT_COLLECTION_HEADER_INHERITENCE",
                },
                "parentID": "root_collection_id_0",
                "parentName": "Test Collection #0",
              },
            ],
          },
          "type": "ok",
        }
      `)
  })

  test("export rest collections", async () => {
    mockFetchAllTeams()

    const container = new TestContainer()
    const teamsWorkspaceProviderService = container.bind(
      TeamsWorkspaceProviderService
    )

    await teamsWorkspaceProviderService.init()

    const sampleWorkspace = await getSampleWorkspaceForTesting(
      "workspace_id_0",
      teamsWorkspaceProviderService
    )

    /**
     * - root_collection_0
     *    - child_collection_0_0
     *      - nested_child_collection_0_0_0
     *      - nested_child_collection_1_0_1
     *      - nested_request_0_0_0
     *      - nested_request_0_0_1
     *    - child_collection_0_1
     *    - child_collection_0_2
     *    - request_0_0
     *    - request_0_1
     * - root_collection_1
     *    - child_collection_1_0
     *      - nested_child_collection_1_0_0
     *        - nested_nested_request_1_0_0_0
     *        - nested_nested_request_1_0_0_1
     *      - nested_child_collection_1_0_1
     *      - nested_request_1_0_0
     *    - child_collection_1_1
     *      - nested_request_1_1_0
     *    - child_collection_1_2
     *    - request_1_0
     *    - request_1_1
     *    - request_1_2
     */

    teamsWorkspaceProviderService._setCollections([
      {
        collectionID: "root_collection_0",
        name: "Root Collection 0",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a0",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
      },
      {
        collectionID: "child_collection_0_0",
        name: "Child Collection 0 0",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a0",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "root_collection_0",
      },
      {
        collectionID: "nested_child_collection_0_0_0",
        name: "Nested Child Collection 0 0 0",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a0",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "child_collection_0_0",
      },
      {
        collectionID: "nested_child_collection_1_0_1",
        name: "Nested Child Collection 1 0 1",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a1",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "child_collection_0_0",
      },
      {
        collectionID: "child_collection_0_1",
        name: "Child Collection 0 1",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a1",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "root_collection_0",
      },
      {
        collectionID: "child_collection_0_2",
        name: "Child Collection 0 2",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a2",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "root_collection_0",
      },
      {
        collectionID: "root_collection_1",
        name: "Root Collection 1",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a1",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
      },
      {
        collectionID: "child_collection_1_0",
        name: "Child Collection 1 0",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a0",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "root_collection_1",
      },
      {
        collectionID: "nested_child_collection_1_0_0",
        name: "Nested Child Collection 1 0 0",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a0",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "child_collection_1_0",
      },
      {
        collectionID: "nested_child_collection_1_0_1",
        name: "Nested Child Collection 1 0 1",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a1",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "child_collection_1_0",
      },
      {
        collectionID: "child_collection_1_1",
        name: "Child Collection 1 1",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a1",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "root_collection_1",
      },
      {
        collectionID: "child_collection_1_2",
        name: "Child Collection 1 2",
        auth: {
          authType: "inherit",
          authActive: true,
        },
        headers: [],
        order: "a2",
        providerID: "TEAMS_WORKSPACE_PROVIDER",
        workspaceID: "workspace_id_0",
        parentCollectionID: "root_collection_1",
      },
    ])

    const mockedInitializedDownloadFile = vi
      .mocked(initializeDownloadFile)
      .mockResolvedValue(E.right("DOWNLOAD_STARTED"))

    const exportedJSON =
      await teamsWorkspaceProviderService.exportRESTCollections(sampleWorkspace)

    expect(JSON.parse(mockedInitializedDownloadFile.mock.calls[0][0]))
      .toMatchInlineSnapshot(`
      [
        {
          "auth": {
            "authActive": true,
            "authType": "inherit",
          },
          "folders": [
            {
              "auth": {
                "authActive": true,
                "authType": "inherit",
              },
              "folders": [
                {
                  "auth": {
                    "authActive": true,
                    "authType": "inherit",
                  },
                  "folders": [],
                  "headers": [],
                  "id": "nested_child_collection_0_0_0",
                  "name": "Nested Child Collection 0 0 0",
                  "order": "a0",
                  "parentCollectionID": "child_collection_0_0",
                  "requests": [],
                  "v": 2,
                },
              ],
              "headers": [],
              "id": "child_collection_0_0",
              "name": "Child Collection 0 0",
              "order": "a0",
              "parentCollectionID": "root_collection_0",
              "requests": [],
              "v": 2,
            },
            {
              "auth": {
                "authActive": true,
                "authType": "inherit",
              },
              "folders": [],
              "headers": [],
              "id": "child_collection_0_1",
              "name": "Child Collection 0 1",
              "order": "a1",
              "parentCollectionID": "root_collection_0",
              "requests": [],
              "v": 2,
            },
            {
              "auth": {
                "authActive": true,
                "authType": "inherit",
              },
              "folders": [],
              "headers": [],
              "id": "child_collection_0_2",
              "name": "Child Collection 0 2",
              "order": "a2",
              "parentCollectionID": "root_collection_0",
              "requests": [],
              "v": 2,
            },
          ],
          "headers": [],
          "id": "root_collection_0",
          "name": "Root Collection 0",
          "order": "a0",
          "requests": [],
          "v": 2,
        },
        {
          "auth": {
            "authActive": true,
            "authType": "inherit",
          },
          "folders": [
            {
              "auth": {
                "authActive": true,
                "authType": "inherit",
              },
              "folders": [
                {
                  "auth": {
                    "authActive": true,
                    "authType": "inherit",
                  },
                  "folders": [],
                  "headers": [],
                  "id": "nested_child_collection_1_0_0",
                  "name": "Nested Child Collection 1 0 0",
                  "order": "a0",
                  "parentCollectionID": "child_collection_1_0",
                  "requests": [],
                  "v": 2,
                },
                {
                  "auth": {
                    "authActive": true,
                    "authType": "inherit",
                  },
                  "folders": [],
                  "headers": [],
                  "id": "nested_child_collection_1_0_1",
                  "name": "Nested Child Collection 1 0 1",
                  "order": "a1",
                  "parentCollectionID": "child_collection_1_0",
                  "requests": [],
                  "v": 2,
                },
              ],
              "headers": [],
              "id": "child_collection_1_0",
              "name": "Child Collection 1 0",
              "order": "a0",
              "parentCollectionID": "root_collection_1",
              "requests": [],
              "v": 2,
            },
            {
              "auth": {
                "authActive": true,
                "authType": "inherit",
              },
              "folders": [],
              "headers": [],
              "id": "child_collection_1_1",
              "name": "Child Collection 1 1",
              "order": "a1",
              "parentCollectionID": "root_collection_1",
              "requests": [],
              "v": 2,
            },
            {
              "auth": {
                "authActive": true,
                "authType": "inherit",
              },
              "folders": [],
              "headers": [],
              "id": "child_collection_1_2",
              "name": "Child Collection 1 2",
              "order": "a2",
              "parentCollectionID": "root_collection_1",
              "requests": [],
              "v": 2,
            },
          ],
          "headers": [],
          "id": "root_collection_1",
          "name": "Root Collection 1",
          "order": "a1",
          "requests": [],
          "v": 2,
        },
      ]
    `)
  })

  describe("move + reorder", () => {
    // todo: abstract the vars like this for all the tests
    let sampleWorkspace: Handle<Workspace>
    let teamsWorkspaceProviderService: TeamsWorkspaceProviderService

    beforeEach(async () => {
      mockFetchAllTeams()
      mockMoveTeamCollection()
      mockMoveTeamRequest()
      mockUpdateOrderRESTTeamCollection()
      mockUpdateOrderRESTTeamRequest()

      const container = new TestContainer()
      teamsWorkspaceProviderService = container.bind(
        TeamsWorkspaceProviderService
      )

      await teamsWorkspaceProviderService.init()

      sampleWorkspace = await getSampleWorkspaceForTesting(
        "workspace_id_0",
        teamsWorkspaceProviderService
      )

      seedCollectionsForMovingReorderingExporting(teamsWorkspaceProviderService)
    })

    test("root collection to root collection", async () => {
      const sourceCollectionHandle =
        await teamsWorkspaceProviderService.getCollectionHandle(
          sampleWorkspace,
          "root_collection_1"
        )

      if (E.isLeft(sourceCollectionHandle)) {
        throw new Error("FAILED_TO_GET_SOURCE_COLLECTION")
      }

      await teamsWorkspaceProviderService.moveRESTCollection(
        sourceCollectionHandle.right,
        "root_collection_0"
      )

      // accessing for tests, otherwise it's a private property
      const childrenAfterMoving =
        teamsWorkspaceProviderService.collections.value.filter(
          (collection) => collection.parentCollectionID === "root_collection_0"
        )

      const rootCollectionsAfterMoving =
        teamsWorkspaceProviderService.collections.value.filter(
          (collection) => !collection.parentCollectionID
        )

      // no more root_collection_1 here, because we moved it
      expect(rootCollectionsAfterMoving).toMatchInlineSnapshot(`
        [
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "root_collection_0",
            "headers": [],
            "name": "Root Collection 0",
            "order": "a0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
        ]
      `)

      // can find the root_collection_1 as the child of root_collection_0
      expect(childrenAfterMoving).toMatchInlineSnapshot(`
        [
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_0_0",
            "headers": [],
            "name": "Child Collection 0 0",
            "order": "a0",
            "parentCollectionID": "root_collection_0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_0_1",
            "headers": [],
            "name": "Child Collection 0 1",
            "order": "a1",
            "parentCollectionID": "root_collection_0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_0_2",
            "headers": [],
            "name": "Child Collection 0 2",
            "order": "a2",
            "parentCollectionID": "root_collection_0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "root_collection_1",
            "headers": [],
            "name": "Root Collection 1",
            "order": "a3",
            "parentCollectionID": "root_collection_0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
        ]
      `)
    })

    test("child collection to root collection", async () => {
      const sourceCollectionHandle =
        await teamsWorkspaceProviderService.getCollectionHandle(
          sampleWorkspace,
          "child_collection_0_1"
        )

      if (E.isLeft(sourceCollectionHandle)) {
        throw new Error("FAILED_TO_GET_SOURCE_COLLECTION")
      }

      await teamsWorkspaceProviderService.moveRESTCollection(
        sourceCollectionHandle.right,
        "root_collection_1"
      )

      // accessing for tests, otherwise it's a private property
      const childrenAfterMoving =
        teamsWorkspaceProviderService.collections.value.filter(
          (collection) => collection.parentCollectionID === "root_collection_1"
        )

      const sourceCollectionSiblingsAfterMoving =
        teamsWorkspaceProviderService.collections.value.filter(
          (col) => col.parentCollectionID === "root_collection_0"
        )

      expect(childrenAfterMoving).toMatchInlineSnapshot(`
        [
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_0_1",
            "headers": [],
            "name": "Child Collection 0 1",
            "order": "a3",
            "parentCollectionID": "root_collection_1",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_1_0",
            "headers": [],
            "name": "Child Collection 1 0",
            "order": "a0",
            "parentCollectionID": "root_collection_1",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_1_1",
            "headers": [],
            "name": "Child Collection 1 1",
            "order": "a1",
            "parentCollectionID": "root_collection_1",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_1_2",
            "headers": [],
            "name": "Child Collection 1 2",
            "order": "a2",
            "parentCollectionID": "root_collection_1",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
        ]
      `)

      expect(sourceCollectionSiblingsAfterMoving).toMatchInlineSnapshot(`
        [
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_0_0",
            "headers": [],
            "name": "Child Collection 0 0",
            "order": "a0",
            "parentCollectionID": "root_collection_0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_0_2",
            "headers": [],
            "name": "Child Collection 0 2",
            "order": "a2",
            "parentCollectionID": "root_collection_0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
        ]
      `)
    })

    test("move a request to another collection", async () => {
      const sourceRequestHandle =
        await teamsWorkspaceProviderService.getRequestHandle(
          sampleWorkspace,
          "request_0_0"
        )

      if (E.isLeft(sourceRequestHandle)) {
        throw new Error("FAILED_TO_GET_SOURCE_REQUEST")
      }

      const res = await teamsWorkspaceProviderService.moveRESTRequest(
        sourceRequestHandle.right,
        "child_collection_1_0"
      )

      if (E.isLeft(res)) {
        throw new Error("FAILED_TO_MOVE_REQUEST")
      }

      const requestsAfterMoving =
        teamsWorkspaceProviderService.requests.value.filter(
          (collection) => collection.collectionID === "child_collection_1_0"
        )

      const sourceRequestSiblingsAfterMoving =
        teamsWorkspaceProviderService.requests.value.filter(
          (req) => req.collectionID === "root_collection_0"
        )

      expect(
        sortByOrder(
          requestsAfterMoving.map((item) => {
            return {
              collectionID: item.collectionID,
              order: item.order,
              providerID: item.providerID,
              workspaceID: item.workspaceID,
              requestID: item.requestID,
            }
          })
        )
      ).toMatchInlineSnapshot(`
        [
          {
            "collectionID": "child_collection_1_0",
            "order": "a0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "requestID": "nested_request_1_0_0",
            "workspaceID": "workspace_id_0",
          },
          {
            "collectionID": "child_collection_1_0",
            "order": "a1",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "requestID": "request_0_0",
            "workspaceID": "workspace_id_0",
          },
        ]
      `)

      expect(
        sortByOrder(
          sourceRequestSiblingsAfterMoving.map((item) => {
            return {
              collectionID: item.collectionID,
              order: item.order,
              providerID: item.providerID,
              workspaceID: item.workspaceID,
              requestID: item.requestID,
            }
          })
        )
      ).toMatchInlineSnapshot(`
        [
          {
            "collectionID": "root_collection_0",
            "order": "a1",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "requestID": "request_0_1",
            "workspaceID": "workspace_id_0",
          },
        ]
      `)
    })

    test("reorder a collection", async () => {
      const sourceCollectionHandle =
        await teamsWorkspaceProviderService.getCollectionHandle(
          sampleWorkspace,
          "child_collection_0_1"
        )

      if (E.isLeft(sourceCollectionHandle)) {
        throw new Error("FAILED_TO_GET_SOURCE_COLLECTION")
      }

      const res = await teamsWorkspaceProviderService.reorderRESTCollection(
        sourceCollectionHandle.right,
        "child_collection_0_0"
      )

      if (E.isLeft(res)) {
        throw new Error("FAILED_TO_REORDER_COLLECTION")
      }

      const childrenAfterReordering =
        teamsWorkspaceProviderService.collections.value.filter(
          (collection) => collection.parentCollectionID === "root_collection_0"
        )

      expect(sortByOrder(childrenAfterReordering)).toMatchInlineSnapshot(`
        [
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_0_1",
            "headers": [],
            "name": "Child Collection 0 1",
            "order": "Zz",
            "parentCollectionID": "root_collection_0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_0_0",
            "headers": [],
            "name": "Child Collection 0 0",
            "order": "a0",
            "parentCollectionID": "root_collection_0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
          {
            "auth": {
              "authActive": true,
              "authType": "inherit",
            },
            "collectionID": "child_collection_0_2",
            "headers": [],
            "name": "Child Collection 0 2",
            "order": "a2",
            "parentCollectionID": "root_collection_0",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "workspaceID": "workspace_id_0",
          },
        ]
      `)
    })

    test("reorder a request", async () => {
      const sourceRequestHandle =
        await teamsWorkspaceProviderService.getRequestHandle(
          sampleWorkspace,
          "request_0_0"
        )

      if (E.isLeft(sourceRequestHandle)) {
        throw new Error("FAILED_TO_GET_SOURCE_REQUEST")
      }

      const res = await teamsWorkspaceProviderService.reorderRESTRequest(
        sourceRequestHandle.right,
        "root_collection_0",
        null
      )

      if (E.isLeft(res)) {
        throw new Error("FAILED_TO_REORDER_REQUEST")
      }

      const requestsAfterReordering =
        teamsWorkspaceProviderService.requests.value.filter(
          (collection) => collection.collectionID === "root_collection_0"
        )

      expect(
        sortByOrder(requestsAfterReordering).map((req) => ({
          collectionID: req.collectionID,
          order: req.order,
          providerID: req.providerID,
          requestID: req.requestID,
          workspaceID: req.workspaceID,
        }))
      ).toMatchInlineSnapshot(`
        [
          {
            "collectionID": "root_collection_0",
            "order": "a1",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "requestID": "request_0_1",
            "workspaceID": "workspace_id_0",
          },
          {
            "collectionID": "root_collection_0",
            "order": "a2",
            "providerID": "TEAMS_WORKSPACE_PROVIDER",
            "requestID": "request_0_0",
            "workspaceID": "workspace_id_0",
          },
        ]
      `)
    })

    // skipping detailed tests, because reorderItems + moveItems, the methods used in reorders and moves are already tested in a separate test suite
  })
})

const getSampleWorkspaceForTesting = async (
  sampleID: "workspace_id_0",
  teamsProviderClass: TeamsWorkspaceProviderService
) => {
  const sampleWorkspace = await teamsProviderClass.getWorkspaceHandle(sampleID)

  if (E.isLeft(sampleWorkspace)) {
    throw new Error("FAILED_TO_CREATE_WORKSPACE")
  }

  return sampleWorkspace.right
}

const createSampleRootCollectionForTesting = async (
  workspace: Handle<Workspace>,
  teamsProviderClass: TeamsWorkspaceProviderService,
  // TODO: make this Partial<HoppCollection>
  fields: {
    name: string
    auth?: HoppRESTAuth
  } = { name: "Test Collection #0" }
) => {
  mockCreateNewRootCollection()

  const collection = await teamsProviderClass.createRESTRootCollection(
    workspace,
    {
      ...fields,
    }
  )

  if (E.isLeft(collection)) {
    console.log(collection.left)
    throw new Error("FAILED_TO_CREATE_COLLECTION")
  }

  return collection.right
}

const createSampleChildCollectionForTesting = async (
  parentCollectionHandle: Handle<WorkspaceCollection>,
  teamsProviderClass: TeamsWorkspaceProviderService,
  fields: {
    name: string
    auth?: HoppRESTAuth
  } = { name: "Test Child Collection #0" }
) => {
  mockCreateNewRootCollection()
  mockCreateChildCollection()

  const childCollection = await teamsProviderClass.createRESTChildCollection(
    parentCollectionHandle,
    {
      ...fields,
    }
  )

  if (E.isLeft(childCollection)) {
    console.log(childCollection.left)
    throw new Error("FAILED_TO_CREATE_CHILD_COLLECTION")
  }

  return childCollection.right
}

const mockFetchAllTeams = () => {
  vi.mocked(fetchAllTeams).mockResolvedValue(
    E.right(<GetMyTeamsQuery>{
      myTeams: [
        {
          id: "workspace_id_0",
          name: "Test Team #0",
          ownersCount: 1,
          teamMembers: [],
        },
      ],
    })
  )
}

const mockCreateNewRootCollection = () => {
  vi.mocked(createNewRootCollection).mockImplementation(() => {
    return TE.right({
      createRootCollection: {
        id: "root_collection_id_0",
      },
    })
  })
}

const mockCreateChildCollection = () => {
  vi.mocked(createChildCollection).mockImplementation(() => {
    return TE.right({
      createChildCollection: {
        id: "child_collection_id_0",
      },
    })
  })
}

const mockUpdateTeamCollection = () => {
  return vi.mocked(updateTeamCollection).mockImplementation(() => {
    const newTitle = "Collection #0 - Updated"

    return TE.right(<UpdateTeamCollectionMutation>{
      updateTeamCollection: {
        id: "root_collection_id_0",
        title: newTitle,
      },
    })
  })
}

const mockCreateRequestInCollection = () => {
  return vi.mocked(createRequestInCollection).mockImplementation(() => {
    return TE.right(<CreateRequestInCollectionMutation>{
      createRequestInCollection: {
        collection: {
          id: "root_collection_id_0",
          team: {
            id: "workspace_id_0",
            name: "Test Team #0",
          },
        },
        id: "request_id_0",
      },
    })
  })
}

const mockUpdateTeamRequest = () => {
  return vi.mocked(updateTeamRequest).mockImplementation(() => {
    return TE.right(<UpdateRequestMutation>{
      updateRequest: {
        id: "request_id_0",
        title: "Request #0 - Updated",
      },
    })
  })
}

const mockDeleteRestCollection = () => {
  return vi.mocked(deleteCollection).mockImplementation(() => {
    return TE.right(<DeleteCollectionMutation>{
      deleteCollection: true,
    })
  })
}

const mockDeleteRestRequest = () => {
  return vi.mocked(deleteTeamRequest).mockImplementation(() => {
    return TE.right({
      deleteRequest: true,
    })
  })
}

const mockGetCollectionChildren = (
  mockCollections?: Record<
    string,
    {
      id: string
      title: string
      data: string
    }[]
  >
) => {
  return vi
    .mocked(getCollectionChildren)
    .mockImplementation(async (collectionID: string) => {
      const auth: HoppRESTAuth = {
        authType: "basic",
        username: "test_username",
        password: "test_password",
        authActive: true,
      }

      const headers: HoppRESTHeader[] = [
        {
          key: "X-Vitest-Mocked-Header",
          value: "mocked-header",
          active: true,
        },
      ]

      const defaultChildren = [
        {
          id: "child_collection_id_0",
          title: "Test Child Collection #0",
          data: JSON.stringify({
            auth,
            headers,
          }),
        },
        {
          id: "child_collection_id_1",
          title: "Test Child Collection #1",
          data: JSON.stringify({
            auth,
            headers,
          }),
        },
        {
          id: "child_collection_id_2",
          title: "Test Child Collection #2",
          data: JSON.stringify({
            auth,
            headers,
          }),
        },
      ]

      const mockValue = mockCollections ? mockCollections[collectionID] : null

      return E.right(<GetCollectionChildrenQuery>{
        collection: {
          children: mockValue || defaultChildren,
        },
      })
    })
}

const mockGetCollectionChildRequests = () => {
  return vi.mocked(getCollectionChildRequests).mockImplementation(async () => {
    return E.right(<GetCollectionRequestsQuery>{
      requestsInCollection: [
        {
          id: "request_id_0",
          title: "Test Request #0",
          request: JSON.stringify(getDefaultRESTRequest()),
        },
        {
          id: "request_id_1",
          title: "Test Request #1",
          request: JSON.stringify(getDefaultRESTRequest()),
        },
        {
          id: "request_id_2",
          title: "Test Request #2",
          request: JSON.stringify(getDefaultRESTRequest()),
        },
      ],
    })
  })
}

const mockGetRootCollections = () => {
  return vi.mocked(getRootCollections).mockImplementation(async () => {
    return E.right(<RootCollectionsOfTeamQuery>{
      rootCollectionsOfTeam: [
        {
          id: "root_collection_id_0",
          title: "Test Collection #0",
          data: JSON.stringify({
            auth: {
              authType: "none",
              authActive: true,
            },
            headers: [
              {
                key: "X-Vitest-Mocked-Header",
                value: "mocked-header",
                active: true,
              },
            ],
          }),
        },
        {
          id: "root_collection_id_1",
          title: "Test Collection #1",
          data: JSON.stringify({
            auth: {
              authType: "none",
              authActive: true,
            },
            headers: [
              {
                key: "X-Vitest-Mocked-Header",
                value: "mocked-header",
                active: true,
              },
            ],
          }),
        },
        {
          id: "root_collection_id_2",
          title: "Test Collection #2",
          data: JSON.stringify({
            auth: {
              authType: "none",
              authActive: true,
            },
            headers: [
              {
                key: "X-Vitest-Mocked-Header",
                value: "mocked-header",
                active: true,
              },
            ],
          }),
        },
      ],
    })
  })
}

const mockMoveTeamCollection = () => {
  return vi.mocked(moveRESTTeamCollection).mockImplementation(() => {
    return TE.right(<MoveRestTeamCollectionMutation>{
      moveCollection: {
        // not using this at this point
        // todo, make sure to pass args to mockMoveTeamCollection and use them to populate this value
        id: "whatever",
      },
    })
  })
}

const mockMoveTeamRequest = () => {
  return vi.mocked(moveRESTTeamRequest).mockImplementation(() => {
    return TE.right(<MoveRestTeamRequestMutation>{
      moveRequest: {
        id: "whatever",
      },
    })
  })
}

const mockUpdateOrderRESTTeamCollection = () => {
  return vi.mocked(updateOrderRESTTeamCollection).mockImplementation(() => {
    return TE.right(<UpdateCollectionOrderMutation>{
      updateCollectionOrder: true,
    })
  })
}

const mockUpdateOrderRESTTeamRequest = () => {
  return vi.mocked(updateOrderRESTTeamRequest).mockImplementation(() => {
    return TE.right(<UpdateLookUpRequestOrderMutation>{
      updateLookUpRequestOrder: true,
    })
  })
}

const seedCollectionsForMovingReorderingExporting = (
  teamsWorkspaceProviderService: TeamsWorkspaceProviderService
) => {
  /**
   * - root_collection_0
   *    - child_collection_0_0
   *      - nested_child_collection_0_0_0
   *      - nested_child_collection_1_0_1
   *      - nested_request_0_0_0
   *      - nested_request_0_0_1
   *    - child_collection_0_1
   *    - child_collection_0_2
   *    - request_0_0
   *    - request_0_1
   * - root_collection_1
   *    - child_collection_1_0
   *      - nested_child_collection_1_0_0
   *        - nested_nested_request_1_0_0_0
   *        - nested_nested_request_1_0_0_1
   *      - nested_child_collection_1_0_1
   *      - nested_request_1_0_0
   *    - child_collection_1_1
   *      - nested_request_1_1_0
   *    - child_collection_1_2
   *    - request_1_0
   *    - request_1_1
   *    - request_1_2
   */

  teamsWorkspaceProviderService._setCollections([
    {
      collectionID: "root_collection_0",
      name: "Root Collection 0",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
    },
    {
      collectionID: "child_collection_0_0",
      name: "Child Collection 0 0",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "root_collection_0",
    },
    {
      collectionID: "nested_child_collection_0_0_0",
      name: "Nested Child Collection 0 0 0",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "child_collection_0_0",
    },
    {
      collectionID: "nested_child_collection_1_0_1",
      name: "Nested Child Collection 1 0 1",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a1",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "child_collection_0_0",
    },
    {
      collectionID: "child_collection_0_1",
      name: "Child Collection 0 1",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a1",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "root_collection_0",
    },
    {
      collectionID: "child_collection_0_2",
      name: "Child Collection 0 2",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a2",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "root_collection_0",
    },
    {
      collectionID: "root_collection_1",
      name: "Root Collection 1",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a1",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
    },
    {
      collectionID: "child_collection_1_0",
      name: "Child Collection 1 0",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "root_collection_1",
    },
    {
      collectionID: "nested_child_collection_1_0_0",
      name: "Nested Child Collection 1 0 0",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "child_collection_1_0",
    },
    {
      collectionID: "nested_child_collection_1_0_1",
      name: "Nested Child Collection 1 0 1",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a1",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "child_collection_1_0",
    },
    {
      collectionID: "child_collection_1_1",
      name: "Child Collection 1 1",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a1",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "root_collection_1",
    },
    {
      collectionID: "child_collection_1_2",
      name: "Child Collection 1 2",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      order: "a2",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      workspaceID: "workspace_id_0",
      parentCollectionID: "root_collection_1",
    },
  ])

  teamsWorkspaceProviderService._setRequests([
    {
      requestID: "request_0_0",
      collectionID: "root_collection_0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      order: "a0",
      request: getDefaultRESTRequest(),
      workspaceID: "workspace_id_0",
    },
    {
      requestID: "request_0_1",
      collectionID: "root_collection_0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      order: "a1",
      request: getDefaultRESTRequest(),
      workspaceID: "workspace_id_0",
    },
    {
      requestID: "nested_request_0_0_0",
      collectionID: "child_collection_0_0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      order: "a0",
      request: getDefaultRESTRequest(),
      workspaceID: "workspace_id_0",
    },
    {
      requestID: "nested_request_0_0_1",
      collectionID: "child_collection_0_0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      order: "a1",
      request: getDefaultRESTRequest(),
      workspaceID: "workspace_id_0",
    },
    {
      requestID: "request_1_0",
      collectionID: "root_collection_1",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      order: "a0",
      request: getDefaultRESTRequest(),
      workspaceID: "workspace_id_0",
    },
    {
      requestID: "request_1_1",
      collectionID: "root_collection_1",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      order: "a1",
      request: getDefaultRESTRequest(),
      workspaceID: "workspace_id_0",
    },
    {
      requestID: "request_1_2",
      collectionID: "root_collection_1",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      order: "a2",
      request: getDefaultRESTRequest(),
      workspaceID: "workspace_id_0",
    },
    {
      requestID: "nested_request_1_0_0",
      collectionID: "child_collection_1_0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      order: "a0",
      request: getDefaultRESTRequest(),
      workspaceID: "workspace_id_0",
    },
    {
      requestID: "nested_nested_request_1_0_0_0",
      collectionID: "nested_child_collection_1_0_0",
      providerID: "TEAMS_WORKSPACE_PROVIDER",
      order: "a0",
      request: getDefaultRESTRequest(),
      workspaceID: "workspace_id_0",
    },
  ])
}
