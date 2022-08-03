<template>
  <div>
    <div class="sticky top-0 z-10 flex flex-col rounded-t bg-primary">
      <tippy ref="options" interactive trigger="click" theme="popover" arrow>
        <template #trigger>
          <span
            v-tippy="{ theme: 'tooltip' }"
            :title="`${t('environment.select')}`"
            class="flex-1 bg-transparent border-b border-dividerLight select-wrapper"
          >
            <ButtonSecondary
              v-if="selectedEnvironmentIndex !== -1"
              :label="environments[selectedEnvironmentIndex].name"
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
            :info-icon="selectedEnvironmentIndex === -1 ? 'done' : ''"
            :active-info-icon="selectedEnvironmentIndex === -1"
            @click.native="
              () => {
                selectedEnvironmentIndex = -1
                options.tippy().hide()
              }
            "
          />
          <hr v-if="environments.length > 0" />
          <SmartItem
            v-for="(gen, index) in environments"
            :key="`gen-${index}`"
            :label="gen.name"
            :info-icon="index === selectedEnvironmentIndex ? 'done' : ''"
            :active-info-icon="index === selectedEnvironmentIndex"
            @click.native="
              () => {
                selectedEnvironmentIndex = index
                options.tippy().hide()
              }
            "
          />
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
    <EnvironmentsTeams v-else :team-id="environmentType.selectedTeam?.id" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "@nuxtjs/composition-api"
import { currentUser$ } from "~/helpers/fb/auth"
import { Team } from "~/helpers/backend/graphql"
import {
  useReadonlyStream,
  useStream,
  useI18n,
} from "~/helpers/utils/composables"
import {
  environments$,
  setCurrentEnvironment,
  selectedEnvIndex$,
  setCurrentEnvironmentType,
  teamEnvironments$,
} from "~/newstore/environments"

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
  setCurrentEnvironmentType(newEnvironmentType)
}

const options = ref<any | null>(null)

const myEnvironments = useReadonlyStream(environments$, [])
const teamEnvironments = useReadonlyStream(teamEnvironments$, [])

const environments = computed(() => {
  if (environmentType.value.type === "my-environments") {
    return myEnvironments.value
  }
  return teamEnvironments.value
})

const selectedEnvironmentIndex = useStream(
  selectedEnvIndex$,
  -1,
  setCurrentEnvironment
)
</script>
