<template>
  <!-- <tippy
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
          class="my-2"
          :active-info-icon="
            selectedEnvironmentIndex.type === 'NO_ENV_SELECTED'
          "
          @click="
            () => {
              setSelectedEnvironmentIndex({ type: 'NO_ENV_SELECTED' })
              hide()
            }
          "
        />
        <HoppSmartTabs
          v-model="selectedEnvTab"
          styles="sticky overflow-x-auto flex-shrink-0 bg-primary z-10 top-0"
          render-inactive-tabs
        >
          <HoppSmartTab
            :id="'my-environments'"
            :label="`${t('environment.my_environments')}`"
          >
            <hr v-if="myEnvironments.length > 0" />
            <HoppSmartItem
              v-for="(gen, index) in myEnvironments"
              :key="`gen-${index}`"
              :label="gen.name"
              :info-icon="index === selectedEnv.index ? IconCheck : undefined"
              :active-info-icon="index === selectedEnv.index"
              @click="
                () => {
                  setSelectedEnvironmentIndex({
                    type: 'MY_ENV',
                    index,
                  })

                  hide()
                }
              "
            />
          </HoppSmartTab>
          <HoppSmartTab
            :id="'team-environments'"
            :label="`${t('environment.team_environments')}`"
            :disabled="
              !isTeamSelected ||
              teamEnvLoading ||
              teamEnvironmentList.length === 0 ||
              environmentType === 'my-environments'
            "
          >
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
                    setSelectedEnvironmentIndex({
                      type: 'TEAM_ENV',
                      teamEnvID: gen.id,
                      teamID: gen.teamID,
                      environment: gen.environment,
                    })
                    hide()
                  }
                "
              />
            </div>
          </HoppSmartTab>
        </HoppSmartTabs>
      </div>
    </template>
  </tippy> -->
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
          class="my-2"
          :active-info-icon="
            selectedEnvironmentIndex.type === 'NO_ENV_SELECTED'
          "
          @click="
            () => {
              setSelectedEnvironmentIndex({ type: 'NO_ENV_SELECTED' })
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
  <!-- <tippy v-else interactive trigger="click" theme="popover">
    <span
      v-tippy="{ theme: 'tooltip' }"
      :title="`${t('environment.select')}`"
      class="bg-transparent border-b border-dividerLight select-wrapper"
    >
      <HoppButtonSecondary
        v-if="selectedEnv.name"
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
        class="flex flex-col"
        role="menu"
        tabindex="0"
        @keyup.escape="hide()"
      >
        <HoppSmartItem
          :label="`${t('environment.no_environment')}`"
          :info-icon="
            selectedEnvironmentIndex.type !== 'TEAM_ENV' ? IconCheck : undefined
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

        Show my env
        <hr v-if="myEnvironments.length > 0" />
        <div class="flex flex-col">
          <span class="px-4 py-2 text-tiny text-secondaryLight">
            My Environments
          </span>
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
        Show my env

        <div
          v-if="!teamEnvLoading && isAdapterError"
          class="flex flex-col items-center py-4"
        >
          <icon-lucide-help-circle class="mb-4 svg-icons" />
          {{ errorMessage }}
        </div>
      </div>
    </template>
  </tippy> -->
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue"
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

const selectedEnvTab = ref<EnvironmentType>("my-environments")

const selectedEnvironmentIndex = useStream(
  selectedEnvironmentIndex$,
  { type: "NO_ENV_SELECTED" },
  setSelectedEnvironmentIndex
)

watch(
  () => props.environmentType,
  (newVal) => {
    if (newVal === "my-environments") {
      selectedEnvTab.value = "my-environments"
    } else {
      selectedEnvTab.value = "team-environments"
    }
  }
)

const selectedEnv = computed(() => {
  console.log("selectedEnvironmentIndex", selectedEnvironmentIndex.value)
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
