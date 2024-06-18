import { beforeAll, describe, expect, test, vi } from "vitest"
import { TeamsWorkspaceProviderService } from "./../teams.workspace"
import * as E from "fp-ts/Either"
import { TestContainer } from "dioc/testing"
import {
  createChildCollection,
  createNewRootCollection,
  updateTeamCollection,
  deleteCollection,
} from "~/helpers/backend/mutations/TeamCollection"

import * as TE from "fp-ts/TaskEither"
import { fetchAllTeams } from "~/helpers/teams/TeamListAdapter"
import {
  CreateRequestInCollectionMutation,
  DeleteCollectionMutation,
  GetCollectionChildrenQuery,
  GetCollectionRequestsQuery,
  GetMyTeamsQuery,
  RootCollectionsOfTeamQuery,
  UpdateRequestMutation,
  UpdateTeamCollectionMutation,
} from "~/helpers/backend/graphql"
import { Handle } from "../../handle"
import { Workspace, WorkspaceCollection } from "../../workspace"
import {
  createRequestInCollection,
  updateTeamRequest,
  deleteTeamRequest,
} from "~/helpers/backend/mutations/TeamRequest"
import {
  getDefaultRESTRequest,
  HoppRESTAuth,
  HoppRESTHeader,
} from "@hoppscotch/data"
import {
  getCollectionChildren,
  getCollectionChildRequests,
  getRootCollections,
} from "~/helpers/backend/helpers"
import { toRaw, watch } from "vue"

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
  }
})

vi.mock("./../../../../helpers/backend/mutations/TeamRequest", () => {
  return {
    createRequestInCollection: vi.fn(),
    updateTeamRequest: vi.fn(),
    deleteTeamRequest: vi.fn(),
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
  teamsProviderClass: TeamsWorkspaceProviderService
) => {
  mockCreateNewRootCollection()

  const collection = await teamsProviderClass.createRESTRootCollection(
    workspace,
    {
      name: "Test Collection #0",
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
  teamsProviderClass: TeamsWorkspaceProviderService
) => {
  mockCreateNewRootCollection()
  mockCreateChildCollection()

  const childCollection = await teamsProviderClass.createRESTChildCollection(
    parentCollectionHandle,
    {
      name: "Test Child Collection #0",
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

const mockGetCollectionChildren = () => {
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

      return E.right(<GetCollectionChildrenQuery>{
        collection: {
          children: [
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
          ],
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
