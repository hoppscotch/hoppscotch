<template>
  <div>
    <input
      v-model="filterText"
      type="search"
      autocomplete="off"
      class="flex w-full bg-transparent px-4 py-2 h-8 border-b border-dividerLight"
      :placeholder="t('action.search')"
    />
    <div
      class="sticky top-upperPrimaryStickyFold z-10 flex flex-1 flex-shrink-0 justify-between overflow-x-auto border-b border-dividerLight bg-primary"
    >
      <HoppButtonSecondary
        :icon="IconPlus"
        :label="`${t('action.new')}`"
        class="!rounded-none"
        @click="displayModalAdd(true)"
      />
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/documentation/features/environments"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconImport"
          :title="t('modal.import_export')"
          @click="displayModalImportExport(true)"
        />
      </div>
    </div>

    <EnvironmentsMyEnvironment
      v-for="{ env, index } in filteredAndAlphabetizedPersonalEnvs"
      :key="`environment-${index}`"
      :environment-index="index"
      :environment="env"
      :selected="isEnvironmentSelected(index)"
      @edit-environment="editEnvironment(index)"
      @select-environment="selectEnvironment(index, env)"
    />
    <HoppSmartPlaceholder
      v-if="filteredAndAlphabetizedPersonalEnvs.length === 0"
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
      :src="
        filterText
          ? undefined
          : `/images/states/${colorMode.value}/blockchain.svg`
      "
    >
      <template v-if="filterText" #icon>
        <icon-lucide-search class="svg-icons opacity-75" />
      </template>

      <template v-else #body>
        <div class="flex flex-col items-center space-y-4">
          <span class="text-center text-secondaryLight">
            {{ t("environment.import_or_create") }}
          </span>
          <div class="flex flex-col items-stretch gap-4">
            <HoppButtonPrimary
              :icon="IconImport"
              :label="t('import.title')"
              filled
              outline
              @click="displayModalImportExport(true)"
            />
            <HoppButtonSecondary
              :icon="IconPlus"
              :label="`${t('add.new')}`"
              filled
              outline
              @click="displayModalAdd(true)"
            />
          </div>
        </div>
      </template>
    </HoppSmartPlaceholder>
    <EnvironmentsMyDetails
      :show="showModalDetails"
      :action="action"
      :editing-environment-index="editingEnvironmentIndex"
      :editing-variable-name="editingVariableName"
      :is-secret-option-selected="secretOptionSelected"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsImportExport
      v-if="showModalImportExport"
      environment-type="MY_ENV"
      @hide-modal="displayModalImportExport(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import {
  environments$,
  selectedEnvironmentIndex$,
} from "~/newstore/environments"
import { useColorMode } from "~/composables/theming"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "~/composables/i18n"
import IconPlus from "~icons/lucide/plus"
import IconImport from "~icons/lucide/folder-down"
import IconHelpCircle from "~icons/lucide/help-circle"
import { defineActionHandler } from "~/helpers/actions"
import { sortPersonalEnvironmentsAlphabetically } from "~/helpers/utils/sortEnvironmentsAlphabetically"
import { HandleEnvChangeProp } from "../index.vue"
import { Environment } from "@hoppscotch/data"

const t = useI18n()
const colorMode = useColorMode()

const emit = defineEmits<{
  (e: "select-environment", data: HandleEnvChangeProp): void
}>()

const environments = useReadonlyStream(environments$, [])

const filterText = ref("")

// Sort environments alphabetically by default and filter by search text
const filteredAndAlphabetizedPersonalEnvs = computed(() => {
  const envs = sortPersonalEnvironmentsAlphabetically(environments.value, "asc")
  const rawFilter = filterText.value

  // Ensure specifying whitespace characters alone result in the empty state for no search results
  const trimmedFilter = rawFilter.trim().toLowerCase()

  // Whitespace-only input results in an empty state
  if (rawFilter && !trimmedFilter) return []

  // No search text → Show all environments
  if (!trimmedFilter) return envs

  // Filter environments based on search text
  return envs.filter(({ env }) =>
    env.name.toLowerCase().includes(trimmedFilter)
  )
})

const showModalImportExport = ref(false)
const showModalDetails = ref(false)
const action = ref<"new" | "edit">("edit")
const editingEnvironmentIndex = ref<number | null>(null)
const editingVariableName = ref("")
const secretOptionSelected = ref(false)

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
const selectEnvironment = (index: number, environment: Environment) => {
  emit("select-environment", {
    index,
    env: {
      type: "my-environment",
      environment,
    },
  })
}
const editEnvironment = (environmentIndex: number) => {
  editingEnvironmentIndex.value = environmentIndex
  action.value = "edit"
  displayModalEdit(true)
}
const resetSelectedData = () => {
  editingEnvironmentIndex.value = null
  editingVariableName.value = ""
  secretOptionSelected.value = false
}

const selectedEnvironmentIndex = useReadonlyStream(selectedEnvironmentIndex$, {
  type: "NO_ENV_SELECTED",
})

const isEnvironmentSelected = (index: number) => {
  return (
    selectedEnvironmentIndex.value.type === "MY_ENV" &&
    selectedEnvironmentIndex.value.index === index
  )
}

defineActionHandler(
  "modals.my.environment.edit",
  ({ envName, variableName, isSecret }) => {
    if (variableName) editingVariableName.value = variableName
    const env = filteredAndAlphabetizedPersonalEnvs.value.find(
      ({ env }) => env.name === envName
    )
    if (envName !== "Global" && env) {
      editEnvironment(env.index)
      secretOptionSelected.value = isSecret ?? false
    }
  }
)
</script>
