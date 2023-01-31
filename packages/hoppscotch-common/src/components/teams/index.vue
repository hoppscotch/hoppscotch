<template>
  <div>
    <div class="space-y-4">
      <ButtonSecondary
        :label="`${t('team.create_new')}`"
        outline
        @click="displayModalAdd(true)"
      />
      <div v-if="loading" class="flex flex-col items-center justify-center">
        <SmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <div
        v-if="!loading && myTeams.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
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
        <ButtonSecondary
          :label="`${t('team.create_new')}`"
          filled
          @click="displayModalAdd(true)"
        />
      </div>
      <div
        v-else-if="!loading"
        class="grid gap-4"
        :class="
          modal ? 'grid-cols-1' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        "
      >
        <TeamsTeam
          v-for="(team, index) in myTeams"
          :key="`team-${String(index)}`"
          :team-i-d="team.id"
          :team="team"
          :compact="modal"
          @edit-team="editTeam(team, team.id)"
          @invite-team="inviteTeam(team, team.id)"
        />
      </div>
      <div v-if="!loading && adapterError" class="flex flex-col items-center">
        <component :is="IconHelpCircle" class="mb-4 svg-icons" />
        {{ t("error.something_went_wrong") }}
      </div>
    </div>
    <TeamsAdd :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <!-- ¯\_(ツ)_/¯ -->
    <TeamsEdit
      v-if="!loading && myTeams.length > 0"
      :team="myTeams[0]"
      :show="showModalEdit"
      :editing-team="editingTeam"
      :editing-team-i-d="editingTeamID"
      @hide-modal="displayModalEdit(false)"
      @invite-team="inviteTeam(editingTeam, editingTeamID)"
      @refetch-teams="refetchTeams"
    />
    <TeamsInvite
      v-if="!loading && myTeams.length > 0"
      :team="myTeams[0]"
      :show="showModalInvite"
      :editing-team="editingTeam"
      :editing-team-i-d="editingTeamID"
      @hide-modal="displayModalInvite(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { onLoggedIn } from "@composables/auth"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useColorMode } from "@composables/theming"

import IconHelpCircle from "~icons/lucide/help-circle"

const t = useI18n()

const colorMode = useColorMode()

defineProps<{
  modal: boolean
}>()

const showModalAdd = ref(false)
const showModalEdit = ref(false)
const showModalInvite = ref(false)
const editingTeam = ref<any>({}) // TODO: Check this out
const editingTeamID = ref<any>("")

const adapter = new TeamListAdapter(true)
const adapterLoading = useReadonlyStream(adapter.loading$, false)
const adapterError = useReadonlyStream(adapter.error$, null)
const myTeams = useReadonlyStream(adapter.teamList$, [])

const loading = computed(
  () => adapterLoading.value && myTeams.value.length === 0
)

onLoggedIn(() => {
  try {
    adapter.initialize()
  } catch (e) {}
})

const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAdd.value = shouldDisplay
  adapter.fetchList()
}

const displayModalEdit = (shouldDisplay: boolean) => {
  showModalEdit.value = shouldDisplay
  adapter.fetchList()
}

const displayModalInvite = (shouldDisplay: boolean) => {
  showModalInvite.value = shouldDisplay
  adapter.fetchList()
}

const editTeam = (team: any, teamID: any) => {
  editingTeam.value = team
  editingTeamID.value = teamID
  displayModalEdit(true)
}

const inviteTeam = (team: any, teamID: any) => {
  editingTeam.value = team
  editingTeamID.value = teamID
  displayModalInvite(true)
}

const refetchTeams = () => {
  adapter.fetchList()
}
</script>
