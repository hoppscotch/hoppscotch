import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { useService } from "dioc/vue"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { computed } from "vue"
import { MockServer, WorkspaceType } from "~/helpers/backend/graphql"
import {
  createMockServer as createMockServerMutation,
  updateMockServer,
} from "~/helpers/backend/mutations/MockServer"
import {
  createTeamEnvironment,
  updateTeamEnvironment,
} from "~/helpers/backend/mutations/TeamEnvironment"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import { restCollections$ } from "~/newstore/collections"
import {
  addEnvironmentVariable,
  createEnvironment,
  environments$,
  getSelectedEnvironmentIndex,
  updateEnvironmentVariable,
} from "~/newstore/environments"
import {
  addMockServer,
  mockServers$,
  updateMockServer as updateMockServerInStore,
} from "~/newstore/mockServers"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { WorkspaceService } from "~/services/workspace.service"

export function useMockServer() {
  const t = useI18n()
  const toast = useToast()
  const workspaceService = useService(WorkspaceService)
  const teamCollectionsService = useService(TeamCollectionsService)

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
        const existingVariableIndex = env.variables.findIndex(
          (v) => v.key === "mockUrl"
        )

        if (existingVariableIndex === -1) {
          // Add to existing selected environment
          addEnvironmentVariable(selectedEnvIndex.index, {
            key: "mockUrl",
            initialValue: mockUrl,
            currentValue: mockUrl,
            secret: false,
          })
          toast.success(t("mock_server.environment_variable_added"))
        } else {
          // Update existing mockUrl variable with new value using the store dispatcher
          updateEnvironmentVariable(
            selectedEnvIndex.index,
            existingVariableIndex,
            {
              key: "mockUrl",
              initialValue: mockUrl,
              currentValue: mockUrl,
            }
          )
          toast.success(t("mock_server.environment_variable_updated"))
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
        // Update existing environment (add or update the mockUrl variable)
        const existingVariableIndex =
          existingEnv.environment.variables.findIndex(
            (v) => v.key === "mockUrl"
          )

        let updatedVariables
        let successMessage

        if (existingVariableIndex === -1) {
          // Variable doesn't exist, add it
          updatedVariables = [
            ...existingEnv.environment.variables,
            { key: "mockUrl", value: mockUrl },
          ]
          successMessage = t("mock_server.environment_variable_added")
        } else {
          // Variable exists, update its value
          updatedVariables = existingEnv.environment.variables.map((v, idx) =>
            idx === existingVariableIndex ? { ...v, value: mockUrl } : v
          )
          successMessage = t("mock_server.environment_variable_updated")
        }

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
              toast.success(successMessage)
            }
          )
        )()
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
        result.serverUrlPathBased || result.serverUrlDomainBased || ""
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
    createMockServer,
    toggleMockServer,
    addMockUrlToEnvironment,
  }
}
