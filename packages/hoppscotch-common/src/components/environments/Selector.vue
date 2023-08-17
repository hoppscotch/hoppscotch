<template>
  <div class="flex divide-x divide-dividerLight">
    <tippy
      interactive
      trigger="click"
      theme="popover"
      :on-shown="() => envSelectorActions!.focus()"
    >
      <span
        v-tippy="{ theme: 'tooltip' }"
        :title="`${t('environment.select')}`"
        class="select-wrapper"
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
          ref="envSelectorActions"
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
            :styles="`sticky overflow-x-auto my-2 border border-divider rounded flex-shrink-0 z-0 top-0 bg-primary ${
              !isTeamSelected || workspace.type === 'personal'
                ? 'bg-primaryLight'
                : ''
            }`"
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
                    selectedEnvironmentIndex = {
                      type: 'MY_ENV',
                      index: index,
                    }
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
                <span class="text-secondaryLight">
                  {{ t("state.loading") }}
                </span>
              </div>
              <div v-if="isTeamSelected" class="flex flex-col">
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
    <span class="flex">
      <tippy
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => envQuickPeekActions!.focus()"
      >
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${t('environment.quick_peek')}`"
          :icon="IconEye"
          class="!px-4"
        />
        <template #content="{ hide }">
          <div
            ref="envQuickPeekActions"
            role="menu"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <div
              class="sticky top-0 font-semibold truncate flex items-center justify-between text-secondaryDark bg-primary border border-divider rounded pl-4"
            >
              {{ t("environment.global_variables") }}
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.edit')"
                :icon="IconEdit"
                @click="
                  () => {
                    editGlobalEnv()
                    hide()
                  }
                "
              />
            </div>
            <div class="my-2 flex flex-col flex-1 space-y-2 pl-4 pr-2">
              <div class="flex flex-1 space-x-4">
                <span class="w-1/4 min-w-32 truncate text-tiny font-semibold">
                  {{ t("environment.name") }}
                </span>
                <span class="w-full min-w-32 truncate text-tiny font-semibold">
                  {{ t("environment.value") }}
                </span>
              </div>
              <div
                v-for="(variable, index) in globalEnvs"
                :key="index"
                class="flex flex-1 space-x-4"
              >
                <span class="text-secondaryLight w-1/4 min-w-32 truncate">
                  {{ variable.key }}
                </span>
                <span class="text-secondaryLight w-full min-w-32 truncate">
                  {{ variable.value }}
                </span>
              </div>
              <div v-if="globalEnvs.length === 0" class="text-secondaryLight">
                {{ t("environment.empty_variables") }}
              </div>
            </div>
            <div
              class="sticky top-0 mt-2 font-semibold truncate flex items-center justify-between text-secondaryDark bg-primary border border-divider rounded pl-4"
              :class="{
                'bg-primaryLight': !selectedEnv.variables,
              }"
            >
              {{ t("environment.list") }}
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :disabled="!selectedEnv.variables"
                :title="t('action.edit')"
                :icon="IconEdit"
                @click="
                  () => {
                    editEnv()
                    hide()
                  }
                "
              />
            </div>
            <div
              v-if="selectedEnv.type === 'NO_ENV_SELECTED'"
              class="text-secondaryLight my-2 flex flex-col flex-1 pl-4"
            >
              {{ t("environment.no_active_environment") }}
            </div>
            <div v-else class="my-2 flex flex-col flex-1 space-y-2 pl-4 pr-2">
              <div class="flex flex-1 space-x-4">
                <span class="w-1/4 min-w-32 truncate text-tiny font-semibold">
                  {{ t("environment.name") }}
                </span>
                <span class="w-full min-w-32 truncate text-tiny font-semibold">
                  {{ t("environment.value") }}
                </span>
              </div>
              <div
                v-for="(variable, index) in environmentVariables"
                :key="index"
                class="flex flex-1 space-x-4"
              >
                <span class="text-secondaryLight w-1/4 min-w-32 truncate">
                  {{ variable.key }}
                </span>
                <span class="text-secondaryLight w-full min-w-32 truncate">
                  {{ variable.value }}
                </span>
              </div>
              <div
                v-if="environmentVariables.length === 0"
                class="text-secondaryLight"
              >
                {{ t("environment.empty_variables") }}
              </div>
            </div>
          </div>
        </template>
      </tippy>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue"
import IconCheck from "~icons/lucide/check"
import IconLayers from "~icons/lucide/layers"
import IconEye from "~icons/lucide/eye"
import IconEdit from "~icons/lucide/edit"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "~/composables/i18n"
import { GQLError } from "~/helpers/backend/GQLClient"
import { useReadonlyStream, useStream } from "~/composables/stream"
import {
  environments$,
  globalEnv$,
  selectedEnvironmentIndex$,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"
import { workspaceStatus$ } from "~/newstore/workspace"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import { useColorMode } from "@composables/theming"
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import { invokeAction } from "~/helpers/actions"

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

const selectedEnv = computed(() => {
  if (selectedEnvironmentIndex.value.type === "MY_ENV") {
    const environment =
      myEnvironments.value[selectedEnvironmentIndex.value.index]
    return {
      type: "MY_ENV",
      index: selectedEnvironmentIndex.value.index,
      name: environment.name,
      variables: environment.variables,
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
        variables: teamEnv.environment.variables,
      }
    } else {
      return { type: "NO_ENV_SELECTED" }
    }
  } else {
    return { type: "NO_ENV_SELECTED" }
  }
})

// Template refs
const envSelectorActions = ref<TippyComponent | null>(null)
const envQuickPeekActions = ref<TippyComponent | null>(null)

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

const globalEnvs = useReadonlyStream(globalEnv$, [])

const environmentVariables = computed(() => {
  if (selectedEnv.value.variables) {
    return selectedEnv.value.variables
  } else {
    return []
  }
})

const editGlobalEnv = () => {
  invokeAction("modals.my.environment.edit", {
    envName: "Global",
  })
}

const editEnv = () => {
  if (selectedEnv.value.type === "MY_ENV" && selectedEnv.value.name) {
    invokeAction("modals.my.environment.edit", {
      envName: selectedEnv.value.name,
    })
  } else if (selectedEnv.value.type === "TEAM_ENV" && selectedEnv.value.name) {
    invokeAction("modals.team.environment.edit", {
      envName: selectedEnv.value.name,
    })
  }
}
</script>
