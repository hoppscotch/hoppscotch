<template>
  <div>
    <div
      class="sticky top-0 z-10 flex flex-col flex-shrink-0 overflow-x-auto rounded-t bg-primary"
    >
      <tippy
        v-if="environmentType.type === 'my-environments'"
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => tippyActions!.focus()"
      >
        <span
          v-tippy="{ theme: 'tooltip' }"
          :title="`${t('environment.select')}`"
          class="bg-transparent border-b border-dividerLight select-wrapper"
        >
          <ButtonSecondary
            v-if="
              selectedEnv.type === 'MY_ENV' && selectedEnv.index !== undefined
            "
            :label="myEnvironments[selectedEnv.index].name"
            class="flex-1 !justify-start pr-8 rounded-none"
          />
          <ButtonSecondary
            v-else
            :label="`${t('environment.select')}`"
            class="flex-1 !justify-start pr-8 rounded-none"
          />
        </span>
        <template #content="{ hide }">
          <div
            ref="tippyActions"
            role="menu"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <SmartItem
              :label="`${t('environment.no_environment')}`"
              :info-icon="
                selectedEnvironmentIndex.type !== 'MY_ENV'
                  ? IconCheck
                  : undefined
              "
              :active-info-icon="selectedEnvironmentIndex.type !== 'MY_ENV'"
              @click="
                () => {
                  selectedEnvironmentIndex = { type: 'NO_ENV_SELECTED' }
                  hide()
                }
              "
            />
            <hr v-if="myEnvironments.length > 0" />
            <SmartItem
              v-for="(gen, index) in myEnvironments"
              :key="`gen-${index}`"
              :label="gen.name"
              :info-icon="index === selectedEnv.index ? IconCheck : undefined"
              :active-info-icon="index === selectedEnv.index"
              @click="
                () => {
                  selectedEnvironmentIndex = { type: 'MY_ENV', index: index }
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
      <tippy v-else interactive trigger="click" theme="popover">
        <span
          v-tippy="{ theme: 'tooltip' }"
          :title="`${t('environment.select')}`"
          class="bg-transparent border-b border-dividerLight select-wrapper"
        >
          <ButtonSecondary
            v-if="selectedEnv.name"
            :label="selectedEnv.name"
            class="flex-1 !justify-start pr-8 rounded-none"
          />
          <ButtonSecondary
            v-else
            :label="`${t('environment.select')}`"
            class="flex-1 !justify-start pr-8 rounded-none"
          />
        </span>
        <template #content="{ hide }">
          <div
            class="flex flex-col"
            role="menu"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <SmartItem
              :label="`${t('environment.no_environment')}`"
              :info-icon="
                selectedEnvironmentIndex.type !== 'TEAM_ENV'
                  ? IconCheck
                  : undefined
              "
              :active-info-icon="selectedEnvironmentIndex.type !== 'TEAM_ENV'"
              @click="
                () => {
                  selectedEnvironmentIndex = { type: 'NO_ENV_SELECTED' }
                  hide()
                }
              "
            />
            <div
              v-if="loading"
              class="flex flex-col items-center justify-center p-4"
            >
              <SmartSpinner class="my-4" />
              <span class="text-secondaryLight">{{ t("state.loading") }}</span>
            </div>
            <hr v-if="teamEnvironmentList.length > 0" />
            <div
              v-if="environmentType.selectedTeam !== undefined"
              class="flex flex-col"
            >
              <SmartItem
                v-for="(gen, index) in teamEnvironmentList"
                :key="`gen-team-${index}`"
                :label="gen.environment.name"
                :info-icon="
                  gen.id === selectedEnv.teamEnvID ? IconCheck : undefined
                "
                :active-info-icon="gen.id === selectedEnv.teamEnvID"
                @click="
                  () => {
                    selectedEnvironmentIndex = {
                      type: 'TEAM_ENV',
                      teamEnvID: gen.id,
                      teamID: gen.teamID,
                      environment: gen.environment,
                    }
                    hide()
                  }
                "
              />
            </div>
            <div
              v-if="!loading && adapterError"
              class="flex flex-col items-center py-4"
            >
              <i class="mb-4 material-icons">help_outline</i>
              {{ getErrorMessage(adapterError) }}
            </div>
          </div>
        </template>
      </tippy>
      <EnvironmentsMyEnvironment
        environment-index="Global"
        :environment="globalEnvironment"
        class="border-b border-dividerLight"
        @edit-environment="editEnvironment('Global')"
      />
      <EnvironmentsChooseType
        :environment-type="environmentType"
        @update-environment-type="updateEnvironmentType"
        @update-selected-team="updateSelectedTeam"
      />
    </div>
    <EnvironmentsMy v-if="environmentType.type === 'my-environments'" />
    <EnvironmentsTeams
      v-if="environmentType.type === 'team-environments'"
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { isEqual } from "lodash-es"
import { platform } from "~/platform"
import { Team } from "~/helpers/backend/graphql"
import { useReadonlyStream, useStream } from "@composables/stream"
import { useI18n } from "~/composables/i18n"
import {
  environments$,
  globalEnv$,
  selectedEnvironmentIndex$,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import { GQLError } from "~/helpers/backend/GQLClient"
import IconCheck from "~icons/lucide/check"
import { TippyComponent } from "vue-tippy"
import { defineActionHandler } from "~/helpers/actions"

const t = useI18n()

type EnvironmentType = "my-environments" | "team-environments"

type SelectedTeam = Team | undefined

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

const updateSelectedTeam = (newSelectedTeam: SelectedTeam) => {
  environmentType.value.selectedTeam = newSelectedTeam
}
const updateEnvironmentType = (newEnvironmentType: EnvironmentType) => {
  environmentType.value.type = newEnvironmentType
}

const adapter = new TeamEnvironmentAdapter(undefined)
const adapterLoading = useReadonlyStream(adapter.loading$, false)
const adapterError = useReadonlyStream(adapter.error$, null)
const teamEnvironmentList = useReadonlyStream(adapter.teamEnvironmentList$, [])

const loading = computed(
  () => adapterLoading.value && teamEnvironmentList.value.length === 0
)

watch(
  () => environmentType.value.selectedTeam?.id,
  (newTeamID) => {
    adapter.changeTeamID(newTeamID)
  }
)

watch(
  () => currentUser.value,
  (newValue) => {
    if (!newValue) {
      updateEnvironmentType("my-environments")
    }
  }
)

const showModalDetails = ref(false)
const action = ref<"new" | "edit">("edit")
const editingEnvironmentIndex = ref<"Global" | null>(null)
const editingVariableName = ref("")

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

const resetSelectedData = () => {
  editingEnvironmentIndex.value = null
}

defineActionHandler(
  "modals.my.environment.edit",
  ({ envName, variableName }) => {
    editingVariableName.value = variableName
    envName === "Global" && editEnvironment("Global")
  }
)

const myEnvironments = useReadonlyStream(environments$, [])

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

const selectedEnv = computed(() => {
  if (selectedEnvironmentIndex.value.type === "MY_ENV") {
    return {
      type: "MY_ENV",
      index: selectedEnvironmentIndex.value.index,
    }
  } else if (selectedEnvironmentIndex.value.type === "TEAM_ENV") {
    const teamEnv = teamEnvironmentList.value.find(
      (env) =>
        env.id ===
        (selectedEnvironmentIndex.value.type === "TEAM_ENV" &&
          selectedEnvironmentIndex.value.teamEnvID)
    )
    if (teamEnv) {
      return {
        type: "TEAM_ENV",
        name: teamEnv.environment.name,
        teamEnvID: selectedEnvironmentIndex.value.teamEnvID,
      }
    } else {
      selectedEnvironmentIndex.value = { type: "NO_ENV_SELECTED" }
      return { type: "NO_ENV_SELECTED" }
    }
  } else {
    selectedEnvironmentIndex.value = { type: "NO_ENV_SELECTED" }
    return { type: "NO_ENV_SELECTED" }
  }
})

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

// Template refs
const tippyActions = ref<TippyComponent | null>(null)
</script>
