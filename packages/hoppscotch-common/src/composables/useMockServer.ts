import { computed } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useReadonlyStream } from "@composables/stream"
import { useService } from "dioc/vue"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { platform } from "~/platform"
import { MockServer, WorkspaceType, ReqType } from "~/helpers/backend/graphql"
import {
  createMockServer as createMockServerMutation,
  updateMockServer,
} from "~/helpers/backend/mutations/MockServer"
import {
  addMockServer,
  mockServers$,
  updateMockServer as updateMockServerInStore,
} from "~/newstore/mockServers"
import {
  addEnvironmentVariable,
  createEnvironment,
  environments$,
  getSelectedEnvironmentIndex,
} from "~/newstore/environments"
import {
  createTeamEnvironment,
  updateTeamEnvironment,
} from "~/helpers/backend/mutations/TeamEnvironment"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { WorkspaceService } from "~/services/workspace.service"
import { restCollections$ } from "~/newstore/collections"
import { hoppRESTImporter } from "~/helpers/import-export/import/importers"
import {
  appendRESTCollections,
  setRESTCollections,
} from "~/newstore/collections"
import { importJSONToTeam } from "~/helpers/backend/mutations/TeamCollection"
import {
  importUserCollectionsFromJSON,
  fetchAndConvertUserCollections,
} from "~/helpers/backend/mutations/UserCollection"
import exampleCollectionJSON from "../../assets/data/api-mock-example.json"

export function useMockServer() {
  const t = useI18n()
  const toast = useToast()
  const workspaceService = useService(WorkspaceService)
  const teamCollectionsService = useService(TeamCollectionsService)

  // Get current user for personal workspace import
  const currentUser = useReadonlyStream(
    platform.auth.getCurrentUserStream(),
    platform.auth.getCurrentUser()
  )

  const mockServers = useReadonlyStream(mockServers$, [])
  const collections = useReadonlyStream(restCollections$, [])
  const currentWorkspace = computed(
    () => workspaceService.currentWorkspace.value
  )

  // Get collections based on current workspace
  const availableCollections = computed(() => {
    if (
      currentWorkspace.value.type === "team" &&
      currentWorkspace.value.teamID
    ) {
      return teamCollectionsService.collections.value || []
    }
    return collections.value
  })

  // Environment management
  const myEnvironments = useReadonlyStream(environments$, [])
  const teamEnvironmentAdapter = new TeamEnvironmentAdapter(
    currentWorkspace.value.type === "team"
      ? currentWorkspace.value.teamID
      : undefined
  )

  // Function to add mock URL to environment
  const addMockUrlToEnvironment = async (
    mockUrl: string,
    collectionName: string
  ) => {
    const workspaceType = currentWorkspace.value.type

    if (workspaceType === "personal") {
      // For personal workspace, add to selected environment or create new one
      const selectedEnvIndex = getSelectedEnvironmentIndex()

      if (selectedEnvIndex.type === "MY_ENV") {
        // Check if mockUrl already exists in the environment
        const env = myEnvironments.value[selectedEnvIndex.index]
        const hasVariable = env.variables.some((v) => v.key === "mockUrl")

        if (!hasVariable) {
          // Add to existing selected environment
          addEnvironmentVariable(selectedEnvIndex.index, {
            key: "mockUrl",
            initialValue: mockUrl,
            currentValue: mockUrl,
            secret: false,
          })
          toast.success(t("mock_server.environment_variable_added"))
        }
      } else {
        // Create a new environment with the mock URL
        const envName = `${collectionName} Environment`
        createEnvironment(envName, [
          {
            key: "mockUrl",
            initialValue: mockUrl,
            currentValue: mockUrl,
            secret: false,
          },
        ])
        toast.success(t("mock_server.environment_created_with_variable"))
      }
    } else if (workspaceType === "team" && currentWorkspace.value.teamID) {
      // For team workspace, create a new team environment or update existing one
      const teamID = currentWorkspace.value.teamID

      // Check if there's an existing team environment for this collection
      const teamEnvs = teamEnvironmentAdapter.teamEnvironmentList$.value
      const existingEnv = teamEnvs.find((env) =>
        env.environment.name.includes(collectionName)
      )

      if (existingEnv) {
        // Update existing environment (add the variable if it doesn't exist)
        const hasVariable = existingEnv.environment.variables.some(
          (v) => v.key === "mockUrl"
        )

        if (!hasVariable) {
          const updatedVariables = [
            ...existingEnv.environment.variables,
            { key: "mockUrl", value: mockUrl },
          ]

          await pipe(
            updateTeamEnvironment(
              JSON.stringify(updatedVariables),
              existingEnv.id,
              existingEnv.environment.name
            ),
            TE.match(
              (error) => {
                console.error("Failed to update team environment:", error)
                toast.error(t("error.something_went_wrong"))
              },
              () => {
                toast.success(t("mock_server.environment_variable_added"))
              }
            )
          )()
        }
      } else {
        // Create new team environment
        const envName = `${collectionName} Environment`
        const variables = [{ key: "mockUrl", value: mockUrl }]

        await pipe(
          createTeamEnvironment(JSON.stringify(variables), teamID, envName),
          TE.match(
            (error) => {
              console.error("Failed to create team environment:", error)
              toast.error(t("error.something_went_wrong"))
            },
            () => {
              toast.success(t("mock_server.environment_created_with_variable"))
            }
          )
        )()
      }
    }
  }

  // Helper function to transform collection for team format
  function translateToTeamCollectionFormat(x: any) {
    const folders: any[] = (x.folders ?? []).map(
      translateToTeamCollectionFormat
    )

    const data = {
      auth: x.auth,
      headers: x.headers,
      variables: x.variables,
    }

    const obj = {
      ...x,
      folders,
      data,
    }

    if (x.id) obj.id = x.id

    return obj
  }

  // Helper function to transform collection for personal format
  function translateToPersonalCollectionFormat(x: any) {
    const folders: any[] = (x.folders ?? []).map(
      translateToPersonalCollectionFormat
    )

    const data = {
      auth: x.auth,
      headers: x.headers,
      variables: x.variables,
    }

    const obj = {
      ...x,
      folders,
      data,
    }

    if (x.id) obj.id = x.id

    return obj
  }

  // Function to create an example collection and return its ID
  const createExampleCollectionAndGetID = async (): Promise<string> => {
    const workspaceType = currentWorkspace.value.type

    // Parse the example collection JSON using hoppRESTImporter
    const parseResult = await hoppRESTImporter([
      JSON.stringify(exampleCollectionJSON),
    ])()

    if (E.isLeft(parseResult)) {
      throw new Error("Failed to parse example collection")
    }

    const collections = parseResult.right

    if (workspaceType === "personal") {
      // For personal workspace, use the same import logic as ImportExport.vue
      const currentUserValue = currentUser.value

      if (currentUserValue) {
        // User is logged in, try to import to backend first
        try {
          const transformedCollection = collections.map((collection) =>
            translateToPersonalCollectionFormat(collection)
          )

          await importUserCollectionsFromJSON(
            JSON.stringify(transformedCollection),
            ReqType.Rest
          )

          // Fetch the updated collections from backend
          const updatedCollections = await fetchAndConvertUserCollections(
            ReqType.Rest
          )

          if (E.isRight(updatedCollections)) {
            setRESTCollections(updatedCollections.right)

            // Return the ID of the last collection (the one we just imported)
            const lastCollection =
              updatedCollections.right[updatedCollections.right.length - 1]
            return lastCollection.id ?? lastCollection._ref_id ?? ""
          }
        } catch (error) {
          console.error("Backend import failed, falling back to local:", error)
        }
      }

      // Fallback: append to local storage
      appendRESTCollections(collections)

      // Get the appended collections
      const updatedCollections = useReadonlyStream(restCollections$, [])

      // Return the ID of the last collection
      const lastCollection =
        updatedCollections.value[updatedCollections.value.length - 1]
      return lastCollection.id ?? lastCollection._ref_id ?? ""
    } else if (workspaceType === "team" && currentWorkspace.value.teamID) {
      // For team workspace
      const teamID = currentWorkspace.value.teamID

      const transformedCollection = collections.map((collection) =>
        translateToTeamCollectionFormat(collection)
      )

      const importResult = await importJSONToTeam(
        JSON.stringify(transformedCollection),
        teamID
      )

      if (!importResult) {
        throw new Error("Failed to import to team workspace")
      }

      // Wait a bit for the subscription to update
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Get the last collection from the team collections
      const teamCollections = teamCollectionsService.collections.value
      if (teamCollections && teamCollections.length > 0) {
        const lastCollection = teamCollections[teamCollections.length - 1]
        return lastCollection.id
      }

      throw new Error("Failed to get imported team collection")
    }

    throw new Error("Unknown workspace type")
  }

  // Create new mock server
  const createMockServer = async (params: {
    mockServerName: string
    collectionID: string
    delayInMs: number
    isPublic: boolean
    setInEnvironment: boolean
    collectionName: string
  }) => {
    const {
      mockServerName,
      collectionID,
      delayInMs,
      isPublic,
      setInEnvironment,
      collectionName,
    } = params

    if (!mockServerName.trim() || !collectionID) {
      if (!collectionID) {
        toast.error(t("mock_server.select_collection_error"))
      }
      return { success: false, server: null }
    }

    // Determine workspace type and ID based on current workspace
    const workspaceType =
      currentWorkspace.value.type === "team"
        ? WorkspaceType.Team
        : WorkspaceType.User
    const workspaceID =
      currentWorkspace.value.type === "team"
        ? currentWorkspace.value.teamID
        : undefined

    const result = await pipe(
      createMockServerMutation(
        mockServerName.trim(),
        collectionID,
        workspaceType,
        workspaceID,
        delayInMs,
        isPublic
      ),
      TE.match(
        (error) => {
          toast.error(String(error) || t("error.something_went_wrong"))
          return null as MockServer | null
        },
        (result) => {
          toast.success(t("mock_server.mock_server_created"))
          // Add the new mock server to the store
          addMockServer(result)
          return result as MockServer
        }
      )
    )()

    if (!result) {
      return { success: false, server: null }
    }

    // Add mock URL to environment if enabled
    if (setInEnvironment) {
      const mockUrl =
        (result as any).serverUrlPathBased ||
        (result as any).serverUrlDomainBased ||
        ""
      if (mockUrl) {
        await addMockUrlToEnvironment(mockUrl, collectionName)
      }
    }

    return { success: true, server: result }
  }

  // Toggle mock server active state
  const toggleMockServer = async (mockServer: MockServer) => {
    const newActiveState = !mockServer.isActive

    return await pipe(
      updateMockServer(mockServer.id, { isActive: newActiveState }),
      TE.match(
        () => {
          toast.error(t("error.something_went_wrong"))
          return { success: false }
        },
        () => {
          toast.success(
            newActiveState
              ? t("mock_server.server_started")
              : t("mock_server.server_stopped")
          )

          // Update the mock server in the store
          updateMockServerInStore(mockServer.id, { isActive: newActiveState })

          return { success: true }
        }
      )
    )()
  }

  return {
    // State
    mockServers,
    availableCollections,
    currentWorkspace,

    // Functions
    createExampleCollectionAndGetID,
    createMockServer,
    toggleMockServer,
    addMockUrlToEnvironment,
  }
}
