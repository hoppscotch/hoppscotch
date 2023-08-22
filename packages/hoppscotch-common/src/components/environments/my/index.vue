<template>
  <div>
    <div
      class="sticky z-10 flex justify-between flex-1 flex-shrink-0 overflow-x-auto border-b top-upperPrimaryStickyFold border-dividerLight bg-primary"
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
          :icon="IconArchive"
          :title="t('modal.import_export')"
          @click="displayModalImportExport(true)"
        />
      </div>
    </div>
    <EnvironmentsMyEnvironment
      v-for="(environment, index) in environments"
      :key="`environment-${index}`"
      :environment-index="index"
      :environment="environment"
      @edit-environment="editEnvironment(index)"
    />
    <HoppSmartPlaceholder
      v-if="environments.length === 0"
      :src="`/images/states/${colorMode.value}/blockchain.svg`"
      :alt="`${t('empty.environments')}`"
      :text="t('empty.environments')"
    >
      <HoppButtonSecondary
        :label="`${t('add.new')}`"
        filled
        outline
        @click="displayModalAdd(true)"
      />
    </HoppSmartPlaceholder>
    <EnvironmentsMyDetails
      :show="showModalDetails"
      :action="action"
      :editing-environment-index="editingEnvironmentIndex"
      :editing-variable-name="editingVariableName"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsImportExport
      :show="showModalImportExport"
      environment-type="MY_ENV"
      @hide-modal="displayModalImportExport(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { environments$ } from "~/newstore/environments"
import { useColorMode } from "~/composables/theming"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "~/composables/i18n"
import IconArchive from "~icons/lucide/archive"
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import { Environment } from "@hoppscotch/data"
import { defineActionHandler } from "~/helpers/actions"

const t = useI18n()
const colorMode = useColorMode()

const environments = useReadonlyStream(environments$, [])

const showModalImportExport = ref(false)
const showModalDetails = ref(false)
const action = ref<"new" | "edit">("edit")
const editingEnvironmentIndex = ref<number | null>(null)
const editingVariableName = ref("")

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
const editEnvironment = (environmentIndex: number) => {
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
    if (variableName) editingVariableName.value = variableName
    const envIndex: number = environments.value.findIndex(
      (environment: Environment) => {
        return environment.name === envName
      }
    )
    if (envName !== "Global") editEnvironment(envIndex)
  }
)
</script>
