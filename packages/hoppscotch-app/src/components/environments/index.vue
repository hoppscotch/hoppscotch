<template>
  <div>
    <div class="sticky top-0 z-10 flex flex-col rounded-t bg-primary">
      <tippy
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => tippyActions.focus()"
      >
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
        <template #content="{ hide }">
          <div
            ref="tippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <SmartItem
              :label="`${t('environment.no_environment')}`"
              :info-icon="selectedEnvironmentIndex === -1 ? IconDone : null"
              :active-info-icon="selectedEnvironmentIndex === -1"
              @click="
                () => {
                  selectedEnvironmentIndex = -1
                  hide()
                }
              "
            />
            <hr v-if="environments.length > 0" />
            <SmartItem
              v-for="(gen, index) in environments"
              :key="`gen-${index}`"
              :label="gen.name"
              :info-icon="index === selectedEnvironmentIndex ? IconDone : null"
              :active-info-icon="index === selectedEnvironmentIndex"
              @click="
                () => {
                  selectedEnvironmentIndex = index
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
      <div class="flex justify-between flex-1 border-b border-dividerLight">
        <ButtonSecondary
          :icon="IconPlus"
          :label="`${t('action.new')}`"
          class="!rounded-none"
          @click="displayModalAdd(true)"
        />
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/features/environments"
            blank
            :title="t('app.wiki')"
            :icon="IconHelpCircle"
          />
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconArchive"
            :title="t('modal.import_export')"
            @click="displayModalImportExport(true)"
          />
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <EnvironmentsEnvironment
        environment-index="Global"
        :environment="globalEnvironment"
        class="border-b border-dashed border-dividerLight"
        @edit-environment="editEnvironment('Global')"
      />
      <EnvironmentsEnvironment
        v-for="(environment, index) in environments"
        :key="`environment-${index}`"
        :environment-index="index"
        :environment="environment"
        @edit-environment="editEnvironment(index)"
      />
    </div>
    <div
      v-if="environments.length === 0"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${colorMode.value}/blockchain.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${t('empty.environments')}`"
      />
      <span class="pb-4 text-center">
        {{ t("empty.environments") }}
      </span>
      <ButtonSecondary
        :label="`${t('add.new')}`"
        filled
        class="mb-4"
        outline
        @click="displayModalAdd(true)"
      />
    </div>
    <EnvironmentsDetails
      :show="showModalDetails"
      :action="action"
      :editing-environment-index="editingEnvironmentIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsImportExport
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
  </div>
</template>

<script setup lang="ts">
import IconDone from "~icons/lucide/check"
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconArchive from "~icons/lucide/archive"
import { computed, ref } from "vue"
import { useReadonlyStream, useStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import {
  environments$,
  setCurrentEnvironment,
  selectedEnvIndex$,
  globalEnv$,
} from "~/newstore/environments"

const t = useI18n()

const colorMode = useColorMode()

const globalEnv = useReadonlyStream(globalEnv$, [])

const globalEnvironment = computed(() => ({
  name: "Global",
  variables: globalEnv.value,
}))

const environments = useReadonlyStream(environments$, [])

const selectedEnvironmentIndex = useStream(
  selectedEnvIndex$,
  -1,
  setCurrentEnvironment
)

// Template refs
const tippyActions = ref<any | null>(null)
const showModalImportExport = ref(false)
const showModalDetails = ref(false)
const action = ref<"new" | "edit">("edit")
const editingEnvironmentIndex = ref<number | "Global" | null>(null)

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
const editEnvironment = (environmentIndex: number | "Global") => {
  editingEnvironmentIndex.value = environmentIndex
  action.value = "edit"
  displayModalEdit(true)
}
const resetSelectedData = () => {
  editingEnvironmentIndex.value = null
}
</script>
