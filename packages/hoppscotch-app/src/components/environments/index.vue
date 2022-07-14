<template>
  <div>
    <div class="sticky top-0 z-10 flex flex-col rounded-t bg-primary">
      <tippy
        v-if="environmentType.type === 'my-environments'"
        ref="options"
        interactive
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <span
            v-tippy="{ theme: 'tooltip' }"
            :title="`${t('environment.select')}`"
            class="flex-1 bg-transparent border-b border-dividerLight select-wrapper"
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
        </template>
        <div class="flex flex-col" role="menu">
          <SmartItem
            :label="`${t('environment.no_environment')}`"
            :info-icon="
              selectedEnvironmentIndex.type !== 'MY_ENV' ? 'done' : ''
            "
            :active-info-icon="selectedEnvironmentIndex.type !== 'MY_ENV'"
            @click.native="
              () => {
                selectedEnvironmentIndex = { type: 'NO_ENV_SELECTED' }
                options.tippy().hide()
              }
            "
          />
          <hr v-if="myEnvironments.length > 0" />
          <SmartItem
            v-for="(gen, index) in myEnvironments"
            :key="`gen-${index}`"
            :label="gen.name"
            :info-icon="index === selectedEnv.index ? 'done' : ''"
            :active-info-icon="index === selectedEnv.index"
            @click.native="
              () => {
                selectedEnvironmentIndex = { type: 'MY_ENV', index: index }
                options.tippy().hide()
              }
            "
          />
        </div>
      </tippy>
      <tippy
        v-else
        ref="options"
        interactive
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <span
            v-tippy="{ theme: 'tooltip' }"
            :title="`${t('environment.select')}`"
            class="flex-1 bg-transparent border-b border-dividerLight select-wrapper"
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
        </template>
        <div class="flex flex-col" role="menu">
          <SmartItem
            :label="`${t('environment.no_environment')}`"
            :info-icon="
              selectedEnvironmentIndex.type !== 'TEAM_ENV' ? 'done' : ''
            "
            :active-info-icon="selectedEnvironmentIndex.type !== 'TEAM_ENV'"
            @click.native="
              () => {
                selectedEnvironmentIndex = { type: 'NO_ENV_SELECTED' }
                options.tippy().hide()
              }
            "
          />
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
              :info-icon="gen.id === selectedEnv.teamEnvID ? 'done' : ''"
              :active-info-icon="gen.id === selectedEnv.teamEnvID"
              @click.native="
                () => {
                  selectedEnvironmentIndex = {
                    type: 'TEAM_ENV',
                    teamEnvID: gen.id,
                    teamID: gen.teamID,
                    environment: gen.environment,
                  }
                  options.tippy().hide()
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
      </tippy>
      <EnvironmentsChooseType
        :environment-type="environmentType"
        :show="showTeamEnvironment"
        @update-environment-type="updateEnvironmentType"
        @update-selected-team="updateSelectedTeam"
      />
    </div>
    <EnvironmentsMy v-if="environmentType.type === 'my-environments'" />
    <EnvironmentsTeams
      v-else
      :team-id="environmentType.selectedTeam?.id"
      :team-environments="teamEnvironmentList"
      :loading="loading"
      :adapter-error="adapterError"
    />
  </div>
</template>

<script setup lang="ts">
import IconDone from "~icons/lucide/check"
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconArchive from "~icons/lucide/archive"
import { currentUser$ } from "~/helpers/fb/auth"
import { Team } from "~/helpers/backend/graphql"
import { computed, ref } from "vue"
import { useReadonlyStream, useStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import {
  environments$,
  selectedEnvironmentIndex$,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import { GQLError } from "~/helpers/backend/GQLClient"

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

const currentUser = useReadonlyStream(currentUser$, null)

const showTeamEnvironment = computed(() => {
  if (currentUser.value == null) {
    return false
  }
  return true
})

const updateSelectedTeam = (newSelectedTeam: SelectedTeam) => {
  environmentType.value.selectedTeam = newSelectedTeam
}
const updateEnvironmentType = (newEnvironmentType: EnvironmentType) => {
  environmentType.value.type = newEnvironmentType
}

const options = ref<any | null>(null)

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
</script>
