<template>
  <div>
    <div
      class="sticky top-0 z-10 flex flex-col flex-shrink-0 overflow-x-auto bg-primary"
    >
      <WorkspaceCurrent :section="t('tab.environments')" />
      <EnvironmentsMyEnvironment
        environment-index="Global"
        :environment="globalEnvironment"
        class="border-b border-dividerLight"
        @edit-environment="editEnvironment('Global')"
      />
    </div>
    <EnvironmentsMy v-show="environmentType.type === 'my-environments'" />
    <EnvironmentsTeams
      v-show="environmentType.type === 'team-environments'"
      :team="environmentType.selectedTeam"
      :team-environments="teamEnvironmentList"
      :loading="loading"
      :adapter-error="adapterError"
    />
    <EnvironmentsMyDetails
      :show="showModalDetails"
      :action="action"
      :editing-environment-index="editingEnvironmentIndex"
      :editing-variable-name="editingVariableName"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsAdd
      :show="showModalNew"
      :name="editingVariableName"
      :value="editingVariableValue"
      :position="position"
      @hide-modal="displayModalNew(false)"
    />
  </div>

  <HoppSmartConfirmModal
    :show="showConfirmRemoveEnvModal"
    :title="t('confirm.remove_team')"
    @hide-modal="showConfirmRemoveEnvModal = false"
    @resolve="removeSelectedEnvironment()"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { isEqual } from "lodash-es"
import { platform } from "~/platform"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import { useReadonlyStream, useStream } from "@composables/stream"
import { useI18n } from "~/composables/i18n"
import {
  getSelectedEnvironmentIndex,
  globalEnv$,
  selectedEnvironmentIndex$,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import { defineActionHandler } from "~/helpers/actions"
import { workspaceStatus$ } from "~/newstore/workspace"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { useLocalState } from "~/newstore/localstate"
import { onLoggedIn } from "~/composables/auth"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { GQLError } from "~/helpers/backend/GQLClient"
import { deleteEnvironment } from "~/newstore/environments"
import { deleteTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"
import { useToast } from "~/composables/toast"

const t = useI18n()
const toast = useToast()

type EnvironmentType = "my-environments" | "team-environments"

type SelectedTeam = GetMyTeamsQuery["myTeams"][number] | undefined

type EnvironmentsChooseType = {
  type: EnvironmentType
  selectedTeam: SelectedTeam
}

const environmentType = ref<EnvironmentsChooseType>({
  type: "my-environments",
  selectedTeam: undefined,
})

const globalEnv = useReadonlyStream(globalEnv$, [])

const globalEnvironment = computed(() => ({
  name: "Global",
  variables: globalEnv.value,
}))

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

// TeamList-Adapter
const teamListAdapter = new TeamListAdapter(true)
const myTeams = useReadonlyStream(teamListAdapter.teamList$, null)
const teamListFetched = ref(false)
const REMEMBERED_TEAM_ID = useLocalState("REMEMBERED_TEAM_ID")

const adapter = new TeamEnvironmentAdapter(undefined)
const adapterLoading = useReadonlyStream(adapter.loading$, false)
const adapterError = useReadonlyStream(adapter.error$, null)
const teamEnvironmentList = useReadonlyStream(adapter.teamEnvironmentList$, [])

const loading = computed(
  () => adapterLoading.value && teamEnvironmentList.value.length === 0
)

watch(
  () => myTeams.value,
  (newTeams) => {
    if (newTeams && !teamListFetched.value) {
      teamListFetched.value = true
      if (REMEMBERED_TEAM_ID.value && currentUser.value) {
        const team = newTeams.find((t) => t.id === REMEMBERED_TEAM_ID.value)
        if (team) updateSelectedTeam(team)
      }
    }
  }
)

const switchToMyEnvironments = () => {
  environmentType.value.selectedTeam = undefined
  updateEnvironmentType("my-environments")
  adapter.changeTeamID(undefined)
}

const updateSelectedTeam = (newSelectedTeam: SelectedTeam | undefined) => {
  if (newSelectedTeam) {
    environmentType.value.selectedTeam = newSelectedTeam
    REMEMBERED_TEAM_ID.value = newSelectedTeam.id
    updateEnvironmentType("team-environments")
  }
}
const updateEnvironmentType = (newEnvironmentType: EnvironmentType) => {
  environmentType.value.type = newEnvironmentType
}

watch(
  () => environmentType.value.selectedTeam,
  (newTeam) => {
    if (newTeam) {
      adapter.changeTeamID(newTeam.id)
    }
  }
)

onLoggedIn(() => {
  !teamListAdapter.isInitialized && teamListAdapter.initialize()
})

const workspace = useReadonlyStream(workspaceStatus$, { type: "personal" })

// Switch to my environments if workspace is personal and to team environments if workspace is team
// also resets selected environment if workspace is personal and the previous selected environment was a team environment
watch(workspace, (newWorkspace) => {
  if (newWorkspace.type === "personal") {
    switchToMyEnvironments()
    if (selectedEnvironmentIndex.value.type !== "MY_ENV") {
      setSelectedEnvironmentIndex({
        type: "NO_ENV_SELECTED",
      })
    }
  } else if (newWorkspace.type === "team") {
    const team = myTeams.value?.find((t) => t.id === newWorkspace.teamID)
    updateSelectedTeam(team)
  }
})

watch(
  () => currentUser.value,
  (newValue) => {
    if (!newValue) {
      switchToMyEnvironments()
    }
  }
)

const showConfirmRemoveEnvModal = ref(false)
const showModalNew = ref(false)
const showModalDetails = ref(false)
const action = ref<"new" | "edit">("edit")
const editingEnvironmentIndex = ref<"Global" | null>(null)
const editingVariableName = ref("")
const editingVariableValue = ref("")

const position = ref({ top: 0, left: 0 })

const displayModalNew = (shouldDisplay: boolean) => {
  showModalNew.value = shouldDisplay
}

const displayModalEdit = (shouldDisplay: boolean) => {
  action.value = "edit"
  showModalDetails.value = shouldDisplay

  if (!shouldDisplay) resetSelectedData()
}

const editEnvironment = (environmentIndex: "Global") => {
  editingEnvironmentIndex.value = environmentIndex
  action.value = "edit"
  displayModalEdit(true)
}

const removeSelectedEnvironment = () => {
  const selectedEnvIndex = getSelectedEnvironmentIndex()
  if (selectedEnvIndex?.type === "NO_ENV_SELECTED") return

  if (selectedEnvIndex?.type === "MY_ENV") {
    deleteEnvironment(selectedEnvIndex.index)
    toast.success(`${t("state.deleted")}`)
  }

  if (selectedEnvIndex?.type === "TEAM_ENV") {
    pipe(
      deleteTeamEnvironment(selectedEnvIndex.teamEnvID),
      TE.match(
        (err: GQLError<string>) => {
          console.error(err)
        },
        () => {
          toast.success(`${t("team_environment.deleted")}`)
        }
      )
    )()
  }
}

const resetSelectedData = () => {
  editingEnvironmentIndex.value = null
}

defineActionHandler("modals.environment.new", () => {
  action.value = "new"
  showModalDetails.value = true
})

defineActionHandler("modals.environment.delete-selected", () => {
  showConfirmRemoveEnvModal.value = true
})

defineActionHandler(
  "modals.my.environment.edit",
  ({ envName, variableName }) => {
    if (variableName) editingVariableName.value = variableName
    envName === "Global" && editEnvironment("Global")
  }
)

const selectedEnvironmentIndex = useStream(
  selectedEnvironmentIndex$,
  { type: "NO_ENV_SELECTED" },
  setSelectedEnvironmentIndex
)

/* Checking if there are any changes in the selected team environment when there are any updates
in the selected team environment list */
watch(
  () => teamEnvironmentList.value,
  (newTeamEnvironmentList) => {
    if (
      newTeamEnvironmentList.length > 0 &&
      selectedEnvironmentIndex.value.type === "TEAM_ENV"
    ) {
      const selectedEnv = newTeamEnvironmentList.find(
        (env) =>
          env.id ===
          (selectedEnvironmentIndex.value.type === "TEAM_ENV" &&
            selectedEnvironmentIndex.value.teamEnvID)
      )

      if (selectedEnv) {
        // Checking if the currently selected environment is still the same after the new list is loaded
        const isChange = !isEqual(
          selectedEnvironmentIndex.value.environment,
          selectedEnv.environment
        )

        if (isChange) {
          selectedEnvironmentIndex.value = {
            type: "TEAM_ENV",
            teamEnvID: selectedEnv.id,
            teamID: selectedEnv.teamID,
            environment: selectedEnv.environment,
          }
        }
      }
    }
  },
  { deep: true }
)

defineActionHandler("modals.environment.add", ({ envName, variableName }) => {
  editingVariableName.value = envName
  editingVariableValue.value = variableName
  displayModalNew(true)
})
</script>
