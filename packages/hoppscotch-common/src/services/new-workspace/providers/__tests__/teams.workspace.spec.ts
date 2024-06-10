import { beforeAll, describe, expect, test, vi } from "vitest"
import { TeamsWorkspaceProviderService } from "./../teams.workspace"
import * as E from "fp-ts/Either"
import { TestContainer } from "dioc/testing"
import {
  createChildCollection,
  createNewRootCollection,
  updateTeamCollection,
} from "~/helpers/backend/mutations/TeamCollection"

import * as TE from "fp-ts/TaskEither"
import { fetchAllTeams } from "~/helpers/teams/TeamListAdapter"
import {
  GetMyTeamsQuery,
  UpdateTeamCollectionMutation,
} from "~/helpers/backend/graphql"
import { Handle } from "../../handle"
import { Workspace, WorkspaceCollection } from "../../workspace"
import { watch } from "vue"
import { createRequestInCollection } from "~/helpers/backend/mutations/TeamRequest"
import { getDefaultRESTRequest } from "@hoppscotch/data"

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
  }
})

vi.mock("./../../../../helpers/backend/mutations/TeamRequest", () => {
  return {
    createRequestInCollection: vi.fn(),
  }
})

vi.mock("./../../../../helpers/teams/TeamListAdapter", () => {
  return {
    fetchAllTeams: vi.fn(),
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

    const childCollectionValue = childCollection.get()

    expect(childCollectionValue.value).toMatchInlineSnapshot(`
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

    const childrenValue = children.right.get().value.data.content.value

    expect(childrenValue).toMatchInlineSnapshot(`
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

    const updatedCollection =
      await teamsWorkspaceProviderService.updateRESTCollection(collection, {
        name: "Collection #0 - Updated",
      })

    if (E.isLeft(updatedCollection)) {
      console.log(updatedCollection.left)
      throw new Error("FAILED_TO_UPDATE_COLLECTION")
    }

    expect(collection.get().value).toMatchInlineSnapshot(`
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
          "providerID": "TEAMS_WORKSPACE_PROVIDER",
          "requestID": "request_id_0",
          "workspaceID": "workspace_id_0",
        },
        "type": "ok",
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
  return vi.mocked(createRequestInCollection).mockResolvedValue(
    E.right({
      createRequestInCollection: {
        ...getDefaultRESTRequest(),
        id: "request_id_0",
      },
    })
  )
}

// NOTE FOR TOMORROW AKASH
// the mock for _fetchAllWorkspaces is not working
// check the importActual section
// might be due to the fact that the team service class is not being mocked when using the importActual
