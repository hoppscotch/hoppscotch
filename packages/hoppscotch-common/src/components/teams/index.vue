<template>
  <div>
    <div class="space-y-4">
      <HoppButtonSecondary
        :label="`${t('team.create_new')}`"
        outline
        :icon="IconPlus"
        @click="displayModalAdd(true)"
      />
      <div v-if="loading" class="flex flex-col items-center justify-center">
        <HoppSmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <HoppSmartPlaceholder
        v-if="!loading && myTeams.length === 0"
        :src="`/images/states/${colorMode.value}/add_group.svg`"
        :alt="`${t('empty.teams')}`"
        :text="`${t('empty.teams')}`"
      >
      </HoppSmartPlaceholder>
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
          @refetch-teams="refetchTeams"
        />
      </div>
      <div v-if="!loading && adapterError" class="flex flex-col items-center">
        <icon-lucide-help-circle class="svg-icons mb-4" />
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
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useColorMode } from "@composables/theming"
import { WorkspaceService } from "~/services/workspace.service"
import { useService } from "dioc/vue"
import IconPlus from "~icons/lucide/plus"

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

const workspaceService = useService(WorkspaceService)
const adapter = workspaceService.acquireTeamListAdapter(10000)
const adapterLoading = useReadonlyStream(adapter.loading$, false)
const adapterError = useReadonlyStream(adapter.error$, null)
const myTeams = useReadonlyStream(adapter.teamList$, [])

const loading = computed(
  () => adapterLoading.value && myTeams.value.length === 0
)

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
