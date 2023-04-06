<template>
  <div>
    <div
      class="sticky z-10 flex justify-between flex-1 flex-shrink-0 overflow-x-auto border-b top-upperSecondaryStickyFold border-dividerLight bg-primary"
    >
      <HoppButtonSecondary
        v-if="team === undefined || team.myRole === 'VIEWER'"
        v-tippy="{ theme: 'tooltip' }"
        disabled
        class="!rounded-none"
        :icon="IconPlus"
        :title="t('team.no_access')"
        :label="t('action.new')"
      />
      <HoppButtonSecondary
        v-else
        :icon="IconPlus"
        :label="`${t('action.new')}`"
        class="!rounded-none"
        @click="displayModalAdd(true)"
      />
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/environments"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <HoppButtonSecondary
          v-if="team !== undefined && team.myRole === 'VIEWER'"
          v-tippy="{ theme: 'tooltip' }"
          disabled
          :icon="IconArchive"
          :title="t('modal.import_export')"
        />
        <HoppButtonSecondary
          v-else
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconArchive"
          :title="t('modal.import_export')"
          @click="displayModalImportExport(true)"
        />
      </div>
    </div>
    <div
      v-if="!loading && teamEnvironments.length === 0 && !adapterError"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${colorMode.value}/blockchain.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${t('empty.environments')}`"
      />
      <span class="pb-4 text-center">
        {{ t("empty.environments") }}
      </span>
      <HoppButtonSecondary
        v-if="team === undefined || team.myRole === 'VIEWER'"
        v-tippy="{ theme: 'tooltip' }"
        disabled
        filled
        class="mb-4"
        :icon="IconPlus"
        :title="t('team.no_access')"
        :label="t('action.new')"
      />
      <HoppButtonSecondary
        v-else
        :label="`${t('add.new')}`"
        filled
        outline
        class="mb-4"
        @click="displayModalAdd(true)"
      />
    </div>
    <div v-else-if="!loading">
      <EnvironmentsTeamsEnvironment
        v-for="(environment, index) in JSON.parse(
          JSON.stringify(teamEnvironments)
        )"
        :key="`environment-${index}`"
        :environment="environment"
        :is-viewer="team?.myRole === 'VIEWER'"
        @edit-environment="editEnvironment(environment)"
      />
    </div>
    <div v-if="loading" class="flex flex-col items-center justify-center p-4">
      <HoppSmartSpinner class="my-4" />
      <span class="text-secondaryLight">{{ t("state.loading") }}</span>
    </div>
    <div
      v-if="!loading && adapterError"
      class="flex flex-col items-center py-4"
    >
      <icon-lucide-help-circle class="mb-4 svg-icons" />
      {{ getErrorMessage(adapterError) }}
    </div>
    <EnvironmentsTeamsDetails
      :show="showModalDetails"
      :action="action"
      :editing-environment="editingEnvironment"
      :editing-team-id="team?.id"
      :editing-variable-name="editingVariableName"
      :is-viewer="team?.myRole === 'VIEWER'"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsImportExport
      :show="showModalImportExport"
      :team-environments="teamEnvironments"
      :team-id="team?.id"
      environment-type="TEAM_ENV"
      @hide-modal="displayModalImportExport(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { GQLError } from "~/helpers/backend/GQLClient"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import { useI18n } from "~/composables/i18n"
import { useColorMode } from "~/composables/theming"
import IconPlus from "~icons/lucide/plus"
import IconArchive from "~icons/lucide/archive"
import IconHelpCircle from "~icons/lucide/help-circle"
import { defineActionHandler } from "~/helpers/actions"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"

const t = useI18n()

const colorMode = useColorMode()

type SelectedTeam = GetMyTeamsQuery["myTeams"][number] | undefined

const props = defineProps<{
  team: SelectedTeam
  teamEnvironments: TeamEnvironment[]
  adapterError: GQLError<string> | null
  loading: boolean
}>()

const showModalImportExport = ref(false)
const showModalDetails = ref(false)
const action = ref<"new" | "edit">("edit")
const editingEnvironment = ref<TeamEnvironment | null>(null)
const editingVariableName = ref("")

const displayModalAdd = (shouldDisplay: boolean) => {
  action.value = "new"
  showModalDetails.value = shouldDisplay
}
const displayModalEdit = (shouldDisplay: boolean) => {
  action.value = "edit"
  showModalDetails.value = shouldDisplay

  if (!shouldDisplay) resetSelectedData()
}
const displayModalImportExport = (shouldDisplay: boolean) => {
  showModalImportExport.value = shouldDisplay
}
const editEnvironment = (environment: TeamEnvironment | null) => {
  editingEnvironment.value = environment
  action.value = "edit"
  displayModalEdit(true)
}
const resetSelectedData = () => {
  editingEnvironment.value = null
}

const getErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    return t("error.network_error")
  } else {
    switch (err.error) {
      case "team_environment/not_found":
        return t("team_environment.not_found")
      default:
        return t("error.something_went_wrong")
    }
  }
}

defineActionHandler(
  "modals.team.environment.edit",
  ({ envName, variableName }) => {
    editingVariableName.value = variableName
    const teamEnvToEdit = props.teamEnvironments.find(
      (environment) => environment.environment.name === envName
    )
    if (teamEnvToEdit) editEnvironment(teamEnvToEdit)
  }
)
</script>
