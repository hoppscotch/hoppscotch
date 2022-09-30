<template>
  <div>
    <div class="flex justify-between flex-1 border-y border-dividerLight">
      <ButtonSecondary
        :icon="IconPlus"
        :label="`${t('action.new')}`"
        class="!rounded-none"
        @click="displayModalAdd(true)"
      />
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/environments"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <ButtonSecondary
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
      <ButtonSecondary
        :label="`${t('add.new')}`"
        filled
        class="mb-4"
        @click="displayModalAdd(true)"
      />
    </div>
    <div v-else-if="!loading">
      <EnvironmentsTeamsEnvironment
        v-for="(environment, index) in teamEnvironments"
        :key="`environment-${index}`"
        :environment="environment"
        @edit-environment="editEnvironment(environment)"
      />
    </div>
    <div v-if="loading" class="flex flex-col items-center justify-center p-4">
      <SmartSpinner class="my-4" />
      <span class="text-secondaryLight">{{ t("state.loading") }}</span>
    </div>
    <div
      v-if="!loading && adapterError"
      class="flex flex-col items-center py-4"
    >
      <i class="mb-4 material-icons">help_outline</i>
      {{ getErrorMessage(adapterError) }}
    </div>
    <EnvironmentsTeamsDetails
      :show="showModalDetails"
      :action="action"
      :editing-environment="editingEnvironment"
      :editing-team-id="teamId"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsImportExport
      :show="showModalImportExport"
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

const t = useI18n()

const colorMode = useColorMode()

defineProps<{
  teamId: string | undefined
  teamEnvironments: TeamEnvironment[]
  adapterError: GQLError<string> | null
  loading: boolean
}>()

const showModalImportExport = ref(false)
const showModalDetails = ref(false)
const action = ref<"new" | "edit">("edit")
const editingEnvironment = ref<TeamEnvironment | null>(null)

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
</script>
