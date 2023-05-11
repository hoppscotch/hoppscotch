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
        v-if="selectedEnv.type !== 'NO_ENV_SELECTED'"
        :label="selectedEnv.name"
        class="flex-1 !justify-start pr-8 rounded-none"
      />
      <HoppButtonSecondary
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
        <div v-if="environmentType === 'my-environments'" class="flex flex-col">
          <hr v-if="myEnvironments.length > 0" />
          <HoppSmartItem
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
        <div v-else class="flex flex-col">
          <div
            v-if="teamEnvLoading"
            class="flex flex-col items-center justify-center p-4"
          >
            <HoppSmartSpinner class="my-4" />
            <span class="text-secondaryLight">{{ t("state.loading") }}</span>
          </div>
          <hr v-if="teamEnvironmentList.length > 0" />
          <div v-if="isTeamSelected" class="flex flex-col">
            <HoppSmartItem
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
            v-if="!teamEnvLoading && isAdapterError"
            class="flex flex-col items-center py-4"
          >
            <icon-lucide-help-circle class="mb-4 svg-icons" />
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </template>
  </tippy>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue"
import IconCheck from "~icons/lucide/check"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "~/composables/i18n"
import { GQLError } from "~/helpers/backend/GQLClient"
import { Environment } from "@hoppscotch/data"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import { useStream } from "~/composables/stream"
import {
  selectedEnvironmentIndex$,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"

const t = useI18n()

type EnvironmentType = "my-environments" | "team-environments"

const props = defineProps<{
  environmentType: EnvironmentType
  myEnvironments: Environment[]
  teamEnvironmentList: TeamEnvironment[]
  teamEnvLoading: boolean
  isAdapterError: boolean
  errorMessage: GQLError<string>
  isTeamSelected: boolean
}>()

const selectedEnvironmentIndex = useStream(
  selectedEnvironmentIndex$,
  { type: "NO_ENV_SELECTED" },
  setSelectedEnvironmentIndex
)

const selectedEnv = computed(() => {
  if (selectedEnvironmentIndex.value.type === "MY_ENV") {
    return {
      type: "MY_ENV",
      index: selectedEnvironmentIndex.value.index,
      name: props.myEnvironments[selectedEnvironmentIndex.value.index].name,
    }
  } else if (selectedEnvironmentIndex.value.type === "TEAM_ENV") {
    const teamEnv = props.teamEnvironmentList.find(
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
</script>
