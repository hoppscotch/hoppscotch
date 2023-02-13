<template>
  <div>
    <div class="flex flex-col">
      <div class="flex flex-col">
        <SmartItem
          label="My Workspace"
          :icon="IconUser"
          :info-icon="workspace.type === 'personal' ? IconDone : undefined"
          :active-info-icon="workspace.type === 'personal'"
          @click="changePersonalWorkspace"
        />
        <hr />
      </div>
      <div v-if="loading" class="flex flex-col items-center justify-center">
        <SmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <div
        v-if="!loading && myTeams.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight flex-1"
      >
        <img
          :src="`/images/states/${colorMode.value}/add_group.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 mb-8"
          :alt="`${t('empty.teams')}`"
        />
        <span class="mb-4 text-center">
          {{ t("empty.teams") }}
        </span>
      </div>
      <div v-else-if="!loading" class="flex flex-col">
        <div
          class="sticky -top-2 flex justify-between items-center bg-popover rounded py-2"
        >
          <div class="flex items-center text-secondaryLight px-4">
            <span>
              <component :is="IconUsers" class="mr-4 h-4 w-4" />
            </span>
            <span class="text-[12px]">Teams</span>
          </div>
          <SmartItem
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconPlus"
            :title="`${t('team.create_new')}`"
            @click="displayModalAdd(true)"
          />
        </div>
        <SmartItem
          v-for="(team, index) in myTeams"
          :key="`team-${String(index)}`"
          :label="team.name"
          :info-icon="isActiveWorkspace(team.id) ? IconDone : undefined"
          :active-info-icon="isActiveWorkspace(team.id)"
          @click="changeTeamWorkspace(team)"
        />
      </div>
      <div
        v-if="!loading && teamListAdapterError"
        class="flex flex-col items-center"
      >
        <i class="mb-4 material-icons">help_outline</i>
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
      if (team) changeTeamWorkspace(team)
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

const changeTeamWorkspace = (team: GetMyTeamsQuery["myTeams"][number]) => {
  REMEMBERED_TEAM_ID.value = team.id
  changeWorkspace({
    teamID: team.id,
    teamName: team.name,
    type: "team",
  })
}
const changePersonalWorkspace = () => {
  REMEMBERED_TEAM_ID.value = undefined
  changeWorkspace({
    type: "personal",
  })
}

onLoggedIn(() => {
  teamListadapter.initialize()
})

const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAdd.value = shouldDisplay
  teamListadapter.fetchList()
}
</script>
