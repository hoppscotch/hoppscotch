<template>
  <div v-if="loading" class="flex flex-col items-center justify-center p-4">
    <HoppSmartSpinner class="mb-4" />
    <span class="text-secondaryLight">{{ t("state.loading") }}</span>
  </div>
  <HoppSmartPlaceholder
    v-if="!loading && validWorkspaces.length === 0"
    :src="`/images/states/${colorMode.value}/add_group.svg`"
    :alt="`${t('empty.teams')}`"
    :text="`${t('empty.teams')}`"
  >
    <HoppButtonSecondary
      :label="t('team.create_new')"
      filled
      outline
      :icon="IconPlus"
    />
  </HoppSmartPlaceholder>
  <div class="flex flex-col">
    <div
      class="sticky top-0 z-10 flex items-center justify-between py-2 pl-2 mb-2 -top-2 bg-popover"
    >
      <div class="flex items-center px-2 font-semibold text-secondaryLight">
        {{ t("team.title") }}
      </div>
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :icon="IconPlus"
        :title="`${t('team.create_new')}`"
        outline
        filled
        class="!p-0.75 rounded ml-8"
        @click="isNewTeamModalOpen = true"
      />
      <!-- @click="displayModalAdd(true)" -->
    </div>
    <!-- Debug: using IconPlus for IconUsers & IconDone for now -->
    <HoppSmartItem
      v-for="workspace in validWorkspaces"
      :key="workspace.value.data.workspaceID"
      :icon="IconPlus"
      :label="workspace.value.data.name"
      :info-icon="
        isActiveWorkspace(workspace.value.data.workspaceID)
          ? IconPlus
          : undefined
      "
      :active-info-icon="isActiveWorkspace(workspace.value.data.workspaceID)"
      @click="selectWorkspace(workspace)"
    />
  </div>
  <div
    v-if="!loading && teamListAdapterError"
    class="flex flex-col items-center py-4"
  >
    <icon-lucide-help-circle class="mb-4 svg-icons" />
    {{ t("error.something_went_wrong") }}
  </div>
  <TeamsAdd
    v-if="isNewTeamModalOpen"
    :show="true"
    @hide-modal="isNewTeamModalOpen = false"
  />
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"
import { NewWorkspaceService } from "~/services/new-workspace"
import { computed, watch } from "vue"
import { PersonalWorkspaceProviderService } from "~/services/new-workspace/providers/personal.workspace"
import IconPlus from "~icons/lucide/plus"
// import IconUsers from "~/icons/lucide/users"
// import IconDone from "~/icons/lucide/check"
import { ref } from "vue"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { useReadonlyStream } from "~/composables/stream"
import { useLocalState } from "~/newstore/localstate"
import { platform } from "~/platform"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import { useColorMode } from "~/composables/theming"
import { useI18n } from "~/composables/i18n"
import { TeamsWorkspaceProviderService } from "~/services/new-workspace/providers/teams.workspace"
import { Workspace } from "~/services/new-workspace/workspace"
import { Ref } from "vue"
import { HandleRef } from "~/services/new-workspace/handle"

const t = useI18n()

const colorMode = useColorMode()

const isNewTeamModalOpen = ref(false)

const workspaceService = useService(NewWorkspaceService)
const personalWorkspaceProviderService = useService(
  PersonalWorkspaceProviderService
)

const isActiveWorkspace = computed(() => (id: string) => {
  // if (workspace.value.type === "personal") return false
  // return workspace.value.teamID === id

  return true
})

const teamListadapter = new TeamListAdapter(true)
// const myTeams = useReadonlyStream(teamListadapter.teamList$, [])
const isTeamListLoading = useReadonlyStream(teamListadapter.loading$, false)
const teamListAdapterError = useReadonlyStream(teamListadapter.error$, null)
const REMEMBERED_TEAM_ID = useLocalState("REMEMBERED_TEAM_ID")
const teamListFetched = ref(false)

const currentUser = useReadonlyStream(
  platform.auth.getProbableUserStream(),
  platform.auth.getProbableUser()
)

const teamsService = useService(TeamsWorkspaceProviderService)

const workspaces = teamsService.getWorkspaces()

window.teamsService = teamsService
// const loading = computed(
//   () => isTeamListLoading.value && myTeams.value.length === 0
// )

// const loading = ref(false)

const loading = computed(() => {
  return (
    workspaces.value.type === "invalid" &&
    workspaces.value.reason === "LOADING_WORKSPACES"
  )
})

watch(loading, () => {
  console.group("loading teams")
  console.log("loading", loading.value)
  console.groupEnd()
})

const errorFetchingWorkspaces = computed(() => {
  return (
    workspaces.value.type === "invalid" &&
    workspaces.value.reason !== "LOADING_WORKSPACES"
  )
})

const validWorkspaces = computed(() => {
  if (workspaces.value.type === "invalid") {
    return []
  }

  const validWorkspaceHandles = workspaces.value.data.filter(
    (
      workspaceHandle
    ): workspaceHandle is Ref<{
      type: "ok"
      data: Workspace
    }> => {
      return workspaceHandle.value.type === "ok"
    }
  )

  return validWorkspaceHandles

  // return validWorkspaceHandles.map((workspaceHandle) => {
  //   return workspaceHandle.value.data
  // })
})

// const switchToTeamWorkspace = (team: GetMyTeamsQuery["myTeams"][number]) => {
//   REMEMBERED_TEAM_ID.value = team.id

//   // changeWorkspace({
//   //   teamID: team.id,
//   //   teamName: team.name,
//   //   type: "team",
//   // })
// }

function selectWorkspace(workspace: HandleRef<Workspace>) {
  console.group("selectWorkspace")
  // console.log("workspace", workspace)
  teamsService.selectWorkspace(workspace)
  console.groupEnd()

  // workspaceService.activeWorkspaceHandle.value =
  //   personalWorkspaceProviderService.getPersonalWorkspaceHandle()
}
</script>
