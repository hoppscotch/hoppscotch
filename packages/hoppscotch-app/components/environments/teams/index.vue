<template>
  <div>
    <div class="flex justify-between flex-1 border-b border-dividerLight">
      <ButtonSecondary
        svg="plus"
        :label="`${t('action.new')}`"
        class="!rounded-none"
        @click.native="displayModalAdd(true)"
      />
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/environments"
          blank
          :title="t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          svg="archive"
          :title="t('modal.import_export')"
          @click.native="displayModalImportExport(true)"
        />
      </div>
    </div>
    <div
      v-if="!loading && teamEnvironmentList.length === 0 && !adapterError"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${$colorMode.value}/blockchain.svg`"
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
        @click.native="displayModalAdd(true)"
      />
    </div>
    <div v-else-if="!loading">
      <EnvironmentsTeamsEnvironment
        v-for="(environment, index) in teamEnvironmentList"
        :key="`environment-${index}`"
        :environment="environment"
        @edit-environment="editEnvironment(environment)"
      />
    </div>
    <div v-if="loading" class="flex flex-col items-center justify-center p-4">
      <SmartSpinner class="my-4" />
      <span class="text-secondaryLight">{{ $t("state.loading") }}</span>
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
import { ref, watch, computed, onUnmounted } from "@nuxtjs/composition-api"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import { GQLError } from "~/helpers/backend/GQLClient"
import { onLoggedIn } from "~/helpers/fb/auth"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import { useReadonlyStream, useI18n } from "~/helpers/utils/composables"
import { setTeamEnvironments } from "~/newstore/environments"
import { useLocalState } from "~/newstore/localstate"

const t = useI18n()

const props = defineProps<{
  teamId: "" | undefined
}>()

const REMEMBERED_TEAM_ID = useLocalState("REMEMBERED_TEAM_ID")

const adapter = new TeamEnvironmentAdapter(undefined)
const adapterLoading = useReadonlyStream(adapter.loading$, false)
const adapterError = useReadonlyStream(adapter.error$, null)
const teamEnvironmentList = useReadonlyStream(adapter.teamEnvironmentList$, [])

const loading = computed(
  () => adapterLoading.value && teamEnvironmentList.value.length === 0
)

onLoggedIn(() => {
  if (REMEMBERED_TEAM_ID.value) {
    adapter.changeTeamID(REMEMBERED_TEAM_ID.value)
  }
})

onUnmounted(() => {
  adapter.dispose()
})

watch(
  () => props.teamId,
  (newTeamId) => {
    adapter.changeTeamID(newTeamId)
  }
)

watch(
  () => adapterLoading.value,
  (loading) => {
    if (!loading) {
      const variables: {
        name: string
        variables: {
          key: string
          value: string
        }[]
      }[] = pipe(
        teamEnvironmentList.value,
        A.map((envs: TeamEnvironment) => ({
          name: envs.name,
          variables: JSON.parse(envs.variables),
        }))
      )

      setTeamEnvironments(variables)
    }
  }
)

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
