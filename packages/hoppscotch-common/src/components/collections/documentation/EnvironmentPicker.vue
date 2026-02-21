<template>
  <div>
    <tippy
      interactive
      trigger="click"
      theme="popover"
      :on-shown="() => pickerActions?.focus()"
    >
      <HoppButtonSecondary
        :icon="IconLayers"
        :label="selectedLabel"
        class="flex-1 !justify-start pr-8"
        outline
      />
      <template #content="{ hide }">
        <div
          ref="pickerActions"
          role="menu"
          class="flex flex-col space-y-2 focus:outline-none"
          tabindex="0"
          @keyup.escape="hide()"
        >
          <SmartEnvInput
            v-model="filterText"
            :placeholder="`${t('action.search')}`"
            :context-menu-enabled="false"
            class="border border-dividerDark focus:border-primaryDark rounded"
          />

          <!-- No environment option -->
          <HoppSmartItem
            :label="t('documentation.publish.no_environment')"
            :info-icon="!modelValue ? IconCheck : undefined"
            :active-info-icon="!modelValue"
            @click="
              () => {
                $emit('update:modelValue', null)
                hide()
              }
            "
          />

          <div
            v-if="isLoading"
            class="flex flex-col items-center justify-center p-4"
          >
            <HoppSmartSpinner class="my-2" />
            <span class="text-secondaryLight text-xs">
              {{ t("state.loading") }}
            </span>
          </div>

          <div v-else class="flex flex-col space-y-1 max-h-48 overflow-y-auto">
            <HoppSmartItem
              v-for="env in filteredEnvironments"
              :key="env.id"
              :icon="IconLayers"
              :label="env.name"
              :info-icon="modelValue === env.id ? IconCheck : undefined"
              :active-info-icon="modelValue === env.id"
              @click="
                () => {
                  $emit('update:modelValue', env.id)
                  hide()
                }
              "
            />
            <HoppSmartPlaceholder
              v-if="filteredEnvironments.length === 0 && !isLoading"
              class="break-words"
              :alt="
                filterText
                  ? `${t('empty.search_environment')}`
                  : t('empty.environments')
              "
              :text="
                filterText
                  ? `${t('empty.search_environment')} '${filterText}'`
                  : t('empty.environments')
              "
            >
              <template v-if="filterText" #icon>
                <icon-lucide-search class="svg-icons opacity-75" />
              </template>
            </HoppSmartPlaceholder>
          </div>
        </div>
      </template>
    </tippy>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue"
import { Environment } from "@hoppscotch/data"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { environments$ } from "~/newstore/environments"
import { WorkspaceType } from "~/helpers/backend/graphql"
import { runGQLQuery } from "~/helpers/backend/GQLClient"
import { GetTeamEnvironmentsDocument } from "~/helpers/backend/graphql"
import * as E from "fp-ts/Either"
import IconCheck from "~icons/lucide/check"
import IconLayers from "~icons/lucide/layers"

type EnvironmentOption = {
  id: string
  name: string
}

const props = defineProps<{
  modelValue: string | null
  workspaceType: WorkspaceType
  workspaceID: string
}>()

defineEmits<{
  (e: "update:modelValue", value: string | null): void
}>()

const t = useI18n()

const filterText = ref("")
const isLoading = ref(false)
const availableEnvironments = ref<EnvironmentOption[]>([])

const personalEnvironments = useReadonlyStream(environments$, [])

const pickerActions = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  if (!props.modelValue) return t("documentation.publish.no_environment")
  const env = availableEnvironments.value.find((e) => e.id === props.modelValue)
  return env?.name ?? t("documentation.publish.no_environment")
})

const filteredEnvironments = computed(() => {
  if (!filterText.value) return availableEnvironments.value

  const trimmed = filterText.value.trim().toLowerCase()
  if (!trimmed) return []

  return availableEnvironments.value.filter((env) =>
    env.name.toLowerCase().includes(trimmed)
  )
})

const fetchEnvironments = async () => {
  isLoading.value = true
  availableEnvironments.value = []

  try {
    if (props.workspaceType === WorkspaceType.Team && props.workspaceID) {
      const result = await runGQLQuery({
        query: GetTeamEnvironmentsDocument,
        variables: { teamID: props.workspaceID },
      })

      if (E.isRight(result)) {
        const teamEnvs = (result.right as any).team?.teamEnvironments || []
        availableEnvironments.value = teamEnvs.map(
          (env: { id: string; name: string }) => ({
            id: env.id,
            name: env.name,
          })
        )
      }
    } else {
      availableEnvironments.value = personalEnvironments.value
        .filter((env: Environment) => env.name)
        .map((env: Environment, index: number) => ({
          id: env.id || `personal-${index}`,
          name: env.name,
        }))
    }
  } catch (error) {
    console.error("Error fetching environments:", error)
  } finally {
    isLoading.value = false
  }
}

// Fetch environments when workspace props change or environment list changes
watch(
  [() => props.workspaceType, () => props.workspaceID, personalEnvironments],
  () => {
    fetchEnvironments()
  },
  { immediate: true }
)
</script>
