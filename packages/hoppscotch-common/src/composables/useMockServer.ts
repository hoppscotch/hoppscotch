import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { useService } from "dioc/vue"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { translateToNewEnvironmentVariables } from "@hoppscotch/data"
import { computed } from "vue"
import { WorkspaceType } from "~/helpers/backend/graphql"
import type { MockServer } from "~/helpers/backend/types/MockServer"
import { platform } from "~/platform"
import {
  createTeamEnvironment,
  updateTeamEnvironment,
} from "~/helpers/backend/mutations/TeamEnvironment"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import { uniqueID } from "~/helpers/utils/uniqueID"
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
  loadMockServers,
} from "~/newstore/mockServers"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { WorkspaceService } from "~/services/workspace.service"

/**
 * Picks which mock-server URL should be stored as the `mockUrl`
 * environment variable.
 *
 * Policy: always prefer the subdomain-based URL
 * (`serverUrlDomainBased`) when it's available and fall back to the
 * path-based URL (`serverUrlPathBased`) otherwise. The backend only
 * returns `serverUrlDomainBased` when a wildcard domain is configured,
 * so the path-based URL is the universal fallback. On the cloud
 * instance only `serverUrlDomainBased` is returned, so that URL is
 * used there.
 */
function pickMockUrl(
  server: Pick<MockServer, "serverUrlPathBased" | "serverUrlDomainBased">
): string {
  const path = server.serverUrlPathBased ?? ""
  const subdomain = server.serverUrlDomainBased ?? ""
  return subdomain || path
}

export function useMockServer() {
  const t = useI18n()
  const toast = useToast()
  const workspaceService = useService(WorkspaceService)
  const teamCollectionsService = useService(TeamCollectionsService)
  const currentValueService = useService(CurrentValueService)

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

  // Function to refetch collections and mock servers
  const refetchData = async () => {
    try {
      // Refetch mock servers
      await loadMockServers()

      // Refetch collections based on workspace type
      if (
        currentWorkspace.value.type === "team" &&
        currentWorkspace.value.teamID
      ) {
        // For team workspace, reload team collections by re-initializing with the same team ID
        teamCollectionsService.changeTeamID(currentWorkspace.value.teamID)
      } else {
        // For personal workspace, load REST collections only (mock servers are REST-based)
        if (platform.sync.collections.loadUserCollections) {
          await platform.sync.collections.loadUserCollections("REST")
        }
      }
    } catch (error) {
      console.error("Failed to refetch data:", error)
    }
  }

  // Function to add mock URL to environment
  const addMockUrlToEnvironment = async (
    mockUrl: string,
    collectionName: string
  ) => {
    const workspaceType = currentWorkspace.value.type

    if (workspaceType === "personal") {
      // For personal workspace, add to selected environment or create new one.
      //
      // Architectural note: env variables are split into a persisted half
      // (`initialValue`, goes to the store / backend) and a local half
      // (`currentValue`, stored only in CurrentValueService). The persisted
      // payload must always carry `currentValue: ""`; the real value is
      // registered separately via `currentValueService`.
      const selectedEnvIndex = getSelectedEnvironmentIndex()

      if (selectedEnvIndex.type === "MY_ENV") {
        // Check if mockUrl already exists in the environment
        const env = myEnvironments.value[selectedEnvIndex.index]
        const existingVariableIndex = env.variables.findIndex(
          (v) => v.key === "mockUrl"
        )

        if (existingVariableIndex === -1) {
          // Add to existing selected environment. The new variable will be
          // appended at `env.variables.length` once the dispatch lands.
          const newVarIndex = env.variables.length
          addEnvironmentVariable(selectedEnvIndex.index, {
            key: "mockUrl",
            initialValue: mockUrl,
            currentValue: "",
            secret: false,
          })
          currentValueService.addEnvironmentVariable(env.id, {
            key: "mockUrl",
            currentValue: mockUrl,
            varIndex: newVarIndex,
            isSecret: false,
          })
          toast.success(t("mock_server.environment_variable_added"))
        } else {
          // Update existing mockUrl variable with new value using the
          // store dispatcher. Persist initial only; update the current
          // value separately via the service (remove + add, since there
          // is no explicit update API on the service).
          updateEnvironmentVariable(
            selectedEnvIndex.index,
            existingVariableIndex,
            {
              key: "mockUrl",
              initialValue: mockUrl,
              currentValue: "",
            }
          )
          currentValueService.removeEnvironmentVariable(
            env.id,
            existingVariableIndex
          )
          currentValueService.addEnvironmentVariable(env.id, {
            key: "mockUrl",
            currentValue: mockUrl,
            varIndex: existingVariableIndex,
            isSecret: false,
          })
          toast.success(t("mock_server.environment_variable_updated"))
        }
      } else {
        // Create a new environment with the mock URL.
        // We generate the env ID up front so we can register the current
        // value against the same ID without racing the dispatch.
        const envName = `${collectionName} Environment`
        const envID = uniqueID()
        createEnvironment(
          envName,
          [
            {
              key: "mockUrl",
              initialValue: mockUrl,
              currentValue: "",
              secret: false,
            },
          ],
          envID
        )
        currentValueService.addEnvironment(envID, [
          {
            key: "mockUrl",
            currentValue: mockUrl,
            varIndex: 0,
            isSecret: false,
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

        // Track the varIndex that will hold mockUrl after the update
        // so we can register the current value against the right slot.
        let mockUrlVarIndex: number

        if (existingVariableIndex === -1) {
          // Variable doesn't exist, append it. Team env variables follow
          // the v2 schema ({ key, initialValue, currentValue, secret }).
          // `currentValue` must be empty on persist — the real value is
          // stored locally via CurrentValueService.
          mockUrlVarIndex = existingEnv.environment.variables.length
          updatedVariables = [
            ...existingEnv.environment.variables,
            {
              key: "mockUrl",
              initialValue: mockUrl,
              currentValue: "",
              secret: false,
            },
          ]
          successMessage = t("mock_server.environment_variable_added")
        } else {
          // Variable exists, bump its initialValue; keep currentValue
          // empty on persist and refresh the service entry below.
          //
          // We rebuild the v2 shape explicitly rather than spreading
          // the existing variable — a legacy `{ key, value }` row
          // would otherwise leak its `value` field alongside
          // `initialValue` / `currentValue` and produce a mixed-
          // schema payload.
          mockUrlVarIndex = existingVariableIndex
          updatedVariables = existingEnv.environment.variables.map((v, idx) =>
            idx === existingVariableIndex
              ? {
                  key: "mockUrl",
                  initialValue: mockUrl,
                  currentValue: "",
                  secret: false,
                }
              : v
          )
          successMessage = t("mock_server.environment_variable_updated")
        }

        // Normalize every entry before persisting. Other variables
        // in this list may still be legacy `{ key, value }` rows
        // because `TeamEnvironmentAdapter` subscribes via raw
        // `JSON.parse` without running the translator — if we just
        // stringified `updatedVariables` as-is we could send a
        // mixed-schema payload back to the backend. Running each
        // row through `translateToNewEnvironmentVariables` guarantees
        // all entries are in the v2 shape.
        const normalizedVariables = updatedVariables.map(
          translateToNewEnvironmentVariables
        )

        await pipe(
          updateTeamEnvironment(
            JSON.stringify(normalizedVariables),
            existingEnv.id,
            existingEnv.environment.name
          ),
          TE.match(
            (error) => {
              console.error("Failed to update team environment:", error)
              toast.error(t("error.something_went_wrong"))
            },
            () => {
              // Persist succeeded — now register the real current value
              // against the team env's ID. Remove any stale entry at the
              // same slot first (no explicit update API on the service).
              currentValueService.removeEnvironmentVariable(
                existingEnv.id,
                mockUrlVarIndex
              )
              currentValueService.addEnvironmentVariable(existingEnv.id, {
                key: "mockUrl",
                currentValue: mockUrl,
                varIndex: mockUrlVarIndex,
                isSecret: false,
              })
              toast.success(successMessage)
            }
          )
        )()
      } else {
        // Create new team environment. Variables go out with an empty
        // currentValue; the real value is registered locally against
        // the server-assigned env ID once the mutation returns.
        const envName = `${collectionName} Environment`
        const variables = [
          {
            key: "mockUrl",
            initialValue: mockUrl,
            currentValue: "",
            secret: false,
          },
        ]

        await pipe(
          createTeamEnvironment(JSON.stringify(variables), teamID, envName),
          TE.match(
            (error) => {
              console.error("Failed to create team environment:", error)
              toast.error(t("error.something_went_wrong"))
            },
            (result) => {
              const newEnvID = result.createTeamEnvironment.id
              if (newEnvID) {
                currentValueService.addEnvironment(newEnvID, [
                  {
                    key: "mockUrl",
                    currentValue: mockUrl,
                    varIndex: 0,
                    isSecret: false,
                  },
                ])
              }
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
    collectionID?: string
    autoCreateCollection?: boolean
    autoCreateRequestExample?: boolean
    delayInMs: number
    isPublic: boolean
    setInEnvironment: boolean
    collectionName: string
  }) => {
    const {
      mockServerName,
      collectionID,
      autoCreateCollection,
      autoCreateRequestExample,
      delayInMs,
      isPublic,
      setInEnvironment,
      collectionName,
    } = params

    if (!mockServerName.trim()) {
      return { success: false, server: null }
    }

    // Exactly one of collectionID or autoCreateCollection must be provided (XOR)
    if (
      (!collectionID && !autoCreateCollection) ||
      (collectionID && autoCreateCollection)
    ) {
      toast.error(t("mock_server.select_collection_error"))
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
      platform.backend.createMockServer(
        mockServerName.trim(),
        workspaceType,
        workspaceID,
        delayInMs,
        isPublic,
        collectionID,
        autoCreateCollection,
        autoCreateRequestExample
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

    // Add mock URL to environment if enabled.
    // Always prefer `serverUrlDomainBased`; fall back to
    // `serverUrlPathBased` when the backend has no wildcard domain
    // configured and the subdomain URL comes back null.
    if (setInEnvironment) {
      const mockUrl = pickMockUrl(result)
      if (mockUrl) {
        await addMockUrlToEnvironment(mockUrl, collectionName)
      }
    }

    // Refetch collections and mock servers to get the latest data
    await refetchData()

    return { success: true, server: result }
  }

  // Toggle mock server active state
  const toggleMockServer = async (mockServer: MockServer) => {
    const newActiveState = !mockServer.isActive

    return await pipe(
      platform.backend.updateMockServer(mockServer.id, {
        isActive: newActiveState,
      }),
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
