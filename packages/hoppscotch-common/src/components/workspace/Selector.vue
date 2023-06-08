<template>
  <div>
    <div class="flex flex-col">
      <div class="flex flex-col">
        <HoppSmartItem
          label="My Workspace"
          :icon="IconUser"
          :info-icon="workspace.type === 'personal' ? IconDone : undefined"
          :active-info-icon="workspace.type === 'personal'"
          @click="switchToPersonalWorkspace"
        />
        <hr />
      </div>
      <div v-if="loading" class="flex flex-col items-center justify-center p-4">
        <HoppSmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <HoppSmartPlaceholder
        v-if="!loading && myTeams.length === 0"
        :src="`/images/states/${colorMode.value}/add_group.svg`"
        :alt="`${t('empty.teams')}`"
        :text="`${t('empty.teams')}`"
      >
        <HoppButtonSecondary
          :label="t('team.create_new')"
          filled
          outline
          :icon="IconPlus"
          @click="displayModalAdd(true)"
        />
      </HoppSmartPlaceholder>
      <div v-else-if="!loading" class="flex flex-col">
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
            @click="displayModalAdd(true)"
          />
        </div>
        <HoppSmartItem
          v-for="(team, index) in myTeams"
          :key="`team-${String(index)}`"
          :icon="IconUsers"
          :label="team.name"
          :info-icon="isActiveWorkspace(team.id) ? IconDone : undefined"
          :active-info-icon="isActiveWorkspace(team.id)"
          @click="switchToTeamWorkspace(team)"
        />
      </div>
      <div
        v-if="!loading && teamListAdapterError"
        class="flex flex-col items-center py-4"
      >
        <icon-lucide-help-circle class="mb-4 svg-icons" />
        {{ t("error.something_went_wrong") }}
      </div>
    </div>
    <TeamsAdd :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { onLoggedIn } from "~/composables/auth"
import { useReadonlyStream } from "~/composables/stream"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { platform } from "~/platform"
import { useI18n } from "@composables/i18n"
import IconUser from "~icons/lucide/user"
import IconUsers from "~icons/lucide/users"
import IconPlus from "~icons/lucide/plus"
import { useColorMode } from "@composables/theming"
import { changeWorkspace, workspaceStatus$ } from "~/newstore/workspace"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import IconDone from "~icons/lucide/check"
import { useLocalState } from "~/newstore/localstate"

const t = useI18n()
const colorMode = useColorMode()

const showModalAdd = ref(false)

const currentUser = useReadonlyStream(
  platform.auth.getProbableUserStream(),
  platform.auth.getProbableUser()
)

const teamListadapter = new TeamListAdapter(true)
const myTeams = useReadonlyStream(teamListadapter.teamList$, [])
const isTeamListLoading = useReadonlyStream(teamListadapter.loading$, false)
const teamListAdapterError = useReadonlyStream(teamListadapter.error$, null)
const REMEMBERED_TEAM_ID = useLocalState("REMEMBERED_TEAM_ID")
const teamListFetched = ref(false)

watch(myTeams, (teams) => {
  if (teams && !teamListFetched.value) {
    teamListFetched.value = true
    if (REMEMBERED_TEAM_ID.value && currentUser.value) {
      const team = teams.find((t) => t.id === REMEMBERED_TEAM_ID.value)
      if (team) switchToTeamWorkspace(team)
    }
  }
})

const loading = computed(
  () => isTeamListLoading.value && myTeams.value.length === 0
)

const workspace = useReadonlyStream(workspaceStatus$, { type: "personal" })

const isActiveWorkspace = computed(() => (id: string) => {
  if (workspace.value.type === "personal") return false
  return workspace.value.teamID === id
})

const switchToTeamWorkspace = (team: GetMyTeamsQuery["myTeams"][number]) => {
  REMEMBERED_TEAM_ID.value = team.id
  changeWorkspace({
    teamID: team.id,
    teamName: team.name,
    type: "team",
  })
}

const switchToPersonalWorkspace = () => {
  REMEMBERED_TEAM_ID.value = undefined
  changeWorkspace({
    type: "personal",
  })
}

onLoggedIn(() => {
  teamListadapter.initialize()
})

watch(
  () => currentUser.value,
  (user) => {
    if (!user) {
      switchToPersonalWorkspace()
    }
  }
)

const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAdd.value = shouldDisplay
  teamListadapter.fetchList()
}
</script>
