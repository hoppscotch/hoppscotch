<template>
  <tippy
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
      <HoppButtonSecondary
        :icon="IconLayers"
        :label="
          mdAndLarger
            ? selectedEnv.type !== 'NO_ENV_SELECTED'
              ? selectedEnv.name
              : `${t('environment.select')}`
            : ''
        "
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
        <HoppSmartItem
          :label="`${t('environment.no_environment')}`"
          :info-icon="
            selectedEnvironmentIndex.type === 'NO_ENV_SELECTED'
              ? IconCheck
              : undefined
          "
          :active-info-icon="
            selectedEnvironmentIndex.type === 'NO_ENV_SELECTED'
          "
          @click="
            () => {
              selectedEnvironmentIndex = { type: 'NO_ENV_SELECTED' }
              hide()
            }
          "
        />
        <HoppSmartTabs
          v-model="selectedEnvTab"
          styles="sticky overflow-x-auto my-2 border border-divider rounded flex-shrink-0 z-0 top-0 bg-primary"
          render-inactive-tabs
        >
          <HoppSmartTab
            :id="'my-environments'"
            :label="`${t('environment.my_environments')}`"
          >
            <HoppSmartItem
              v-for="(gen, index) in myEnvironments"
              :key="`gen-${index}`"
              :icon="IconLayers"
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
            <div
              v-if="myEnvironments.length === 0"
              class="flex flex-col items-center justify-center text-secondaryLight"
            >
              <img
                :src="`/images/states/${colorMode.value}/blockchain.svg`"
                loading="lazy"
                class="inline-flex flex-col object-contain object-center w-16 h-16 mb-2"
                :alt="`${t('empty.environments')}`"
              />
              <span class="pb-2 text-center">
                {{ t("empty.environments") }}
              </span>
            </div>
          </HoppSmartTab>
          <HoppSmartTab
            :id="'team-environments'"
            :label="`${t('environment.team_environments')}`"
            :disabled="!isTeamSelected || workspace.type === 'personal'"
          >
            <div
              v-if="teamListLoading"
              class="flex flex-col items-center justify-center p-4"
            >
              <HoppSmartSpinner class="my-4" />
              <span class="text-secondaryLight">{{ t("state.loading") }}</span>
            </div>
            <div v-else-if="isTeamSelected" class="flex flex-col">
              <HoppSmartItem
                v-for="(gen, index) in teamEnvironmentList"
                :key="`gen-team-${index}`"
                :icon="IconLayers"
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
              <div
                v-if="teamEnvironmentList.length === 0"
                class="flex flex-col items-center justify-center text-secondaryLight"
              >
                <img
                  :src="`/images/states/${colorMode.value}/blockchain.svg`"
                  loading="lazy"
                  class="inline-flex flex-col object-contain object-center w-16 h-16 mb-2"
                  :alt="`${t('empty.environments')}`"
                />
                <span class="pb-2 text-center">
                  {{ t("empty.environments") }}
                </span>
              </div>
            </div>
            <div
              v-if="!teamListLoading && teamAdapterError"
              class="flex flex-col items-center py-4"
            >
              <icon-lucide-help-circle class="mb-4 svg-icons" />
              {{ getErrorMessage(teamAdapterError) }}
            </div>
          </HoppSmartTab>
        </HoppSmartTabs>
      </div>
    </template>
  </tippy>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue"
import IconCheck from "~icons/lucide/check"
import IconLayers from "~icons/lucide/layers"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "~/composables/i18n"
import { GQLError } from "~/helpers/backend/GQLClient"
import { useReadonlyStream, useStream } from "~/composables/stream"
import {
  environments$,
  selectedEnvironmentIndex$,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"
import { changeWorkspace, workspaceStatus$ } from "~/newstore/workspace"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import { useColorMode } from "@composables/theming"
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { useLocalState } from "~/newstore/localstate"
import { onLoggedIn } from "~/composables/auth"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const t = useI18n()

const colorMode = useColorMode()

type EnvironmentType = "my-environments" | "team-environments"

const myEnvironments = useReadonlyStream(environments$, [])

const workspace = useReadonlyStream(workspaceStatus$, { type: "personal" })

const teamEnvListAdapter = new TeamEnvironmentAdapter(undefined)
const teamListLoading = useReadonlyStream(teamEnvListAdapter.loading$, false)
const teamAdapterError = useReadonlyStream(teamEnvListAdapter.error$, null)
const teamEnvironmentList = useReadonlyStream(
  teamEnvListAdapter.teamEnvironmentList$,
  []
)

const selectedEnvironmentIndex = useStream(
  selectedEnvironmentIndex$,
  { type: "NO_ENV_SELECTED" },
  setSelectedEnvironmentIndex
)

const isTeamSelected = computed(
  () => workspace.value.type === "team" && workspace.value.teamID !== undefined
)

const selectedEnvTab = ref<EnvironmentType>("my-environments")

watch(
  () => workspace.value,
  (newVal) => {
    if (newVal.type === "personal") {
      selectedEnvTab.value = "my-environments"
    } else {
      selectedEnvTab.value = "team-environments"
      if (newVal.teamID) {
        teamEnvListAdapter.changeTeamID(newVal.teamID)
      }
    }
  }
)

// TeamList-Adapter
const teamListAdapter = new TeamListAdapter(true)
const myTeams = useReadonlyStream(teamListAdapter.teamList$, null)
const teamListFetched = ref(false)
const REMEMBERED_TEAM_ID = useLocalState("REMEMBERED_TEAM_ID")

onLoggedIn(() => {
  !teamListAdapter.isInitialized && teamListAdapter.initialize()
})

const switchToTeamWorkspace = (team: GetMyTeamsQuery["myTeams"][number]) => {
  REMEMBERED_TEAM_ID.value = team.id
  changeWorkspace({
    teamID: team.id,
    teamName: team.name,
    type: "team",
  })
}

watch(
  () => myTeams.value,
  (newTeams) => {
    if (newTeams && !teamListFetched.value) {
      teamListFetched.value = true
      if (REMEMBERED_TEAM_ID.value) {
        const team = newTeams.find((t) => t.id === REMEMBERED_TEAM_ID.value)
        if (team) switchToTeamWorkspace(team)
      }
    }
  }
)

const selectedEnv = computed(() => {
  if (selectedEnvironmentIndex.value.type === "MY_ENV") {
    return {
      type: "MY_ENV",
      index: selectedEnvironmentIndex.value.index,
      name: myEnvironments.value[selectedEnvironmentIndex.value.index].name,
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
      return { type: "NO_ENV_SELECTED" }
    }
  } else {
    return { type: "NO_ENV_SELECTED" }
  }
})

// Template refs
const tippyActions = ref<TippyComponent | null>(null)

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
