<template>
  <HoppSmartModal
    dialog
    :title="t('collection_runner.run_collection')"
    @close="closeModal"
  >
    <template #body>
      <HoppSmartTabs v-model="activeTab">
        <HoppSmartTab id="test-runner" :label="t('collection_runner.ui')">
          <div
            class="flex-shrink-0 w-full h-full p-4 overflow-auto overflow-x-auto bg-primary"
          >
            <section>
              <h4 class="font-semibold text-secondaryDark">
                Run Configuration
              </h4>
              <div class="mt-4">
                <!-- TODO: fix input component types -->
                <HoppSmartInput
                  v-model="config.delay as any"
                  type="number"
                  :label="t('Delay')"
                  class="!rounded-r-none !border-r-0"
                  input-styles="floating-input !rounded-r-none !border-r-0"
                >
                  <template #button>
                    <span
                      class="px-4 py-2 font-semibold border rounded-r bg-primaryLight border-divider text-secondaryLight"
                    >
                      ms
                    </span>
                  </template>
                </HoppSmartInput>
              </div>
            </section>

            <section class="mt-6">
              <span class="text-xs text-secondaryLight">
                Advanced Settings
              </span>

              <div class="flex flex-col gap-4 mt-4 items-start">
                <HoppSmartCheckbox
                  class="pr-2"
                  :on="config.stopOnError"
                  @change="config.stopOnError = !config.stopOnError"
                >
                  <span>Stop run if an error occurs</span>
                </HoppSmartCheckbox>

                <HoppSmartCheckbox
                  class="pr-2"
                  :on="config.persistResponses"
                  @change="config.persistResponses = !config.persistResponses"
                >
                  <span>Persist responses</span>
                  <HoppButtonSecondary
                    class="!py-0 pl-2"
                    v-tippy="{ theme: 'tooltip' }"
                    to="https://docs.hoppscotch.io/documentation/features/inspections"
                    blank
                    :title="t('app.wiki')"
                    :icon="IconHelpCircle"
                  />
                </HoppSmartCheckbox>

                <HoppSmartCheckbox
                  class="pr-2"
                  :on="config.keepVariableValues"
                  @change="
                    config.keepVariableValues = !config.keepVariableValues
                  "
                >
                  <span>Keep variable values</span>
                  <HoppButtonSecondary
                    class="!py-0 pl-2"
                    v-tippy="{ theme: 'tooltip' }"
                    to="https://docs.hoppscotch.io/documentation/features/inspections"
                    blank
                    :title="t('app.wiki')"
                    :icon="IconHelpCircle"
                  />
                </HoppSmartCheckbox>
              </div>
            </section>
          </div>
        </HoppSmartTab>
        <HoppSmartTab id="cli" :label="t('collection_runner.cli')">
          <div class="space-y-4 p-4">
            <p
              class="p-4 mb-4 border rounded-md text-amber-500 border-amber-600"
            >
              {{ cliCommandGenerationDescription }}
            </p>

            <div v-if="environmentID" class="flex gap-x-2 items-center">
              <HoppSmartCheckbox
                :on="includeEnvironmentID"
                @change="toggleIncludeEnvironment"
              />
              <span class="truncate"
                >{{ t("collection_runner.include_active_environment") }}
                <span class="text-secondaryDark">{{
                  activeEnvironment
                }}</span></span
              >
            </div>

            <div
              class="p-4 rounded-md bg-primaryLight text-secondaryDark select-text"
            >
              {{ generatedCLICommand }}
            </div>
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>

    <template #footer>
      <div class="flex space-x-2">
        <HoppButtonPrimary
          v-if="activeTab === 'test-runner'"
          :label="`${t('test.run')}`"
          :icon="IconPlay"
          outline
          @click="runTests"
        />
        <HoppButtonPrimary
          v-else
          :label="`${t('action.copy')}`"
          :icon="copyIcon"
          outline
          @click="copyCLICommandToClipboard"
        />
        <HoppButtonSecondary
          :label="`${t('action.close')}`"
          outline
          filled
          @click="closeModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { refAutoReset } from "@vueuse/core"
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"

import { useToast } from "~/composables/toast"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { SelectedEnvironmentIndex } from "~/newstore/environments"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconPlay from "~icons/lucide/play"
import IconHelpCircle from "~icons/lucide/help-circle"
import { useService } from "dioc/vue"
import { RESTTabService } from "~/services/tab/rest"
import { HoppCollection } from "@hoppscotch/data"
import { TestRunnerConfig } from "~/helpers/rest/document"

const t = useI18n()
const toast = useToast()
const tabs = useService(RESTTabService)

const props = defineProps<{
  collectionID: string
  collectionIndex?: string
  environmentID?: string | null
  collection: HoppCollection
  selectedEnvironmentIndex: SelectedEnvironmentIndex
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const includeEnvironmentID = ref(false)
const activeTab = ref("test-runner")

const config = ref<TestRunnerConfig>({
  iterations: 1,
  delay: 500,
  stopOnError: false,
  persistResponses: false,
  keepVariableValues: false,
})

const runTests = () => {
  // TODO: fix collection runner in tabs
  const possibleTab = tabs.getTabRefWithSaveContext(
    {
      originLocation: "user-collection",
      folderPath: props.collectionIndex!!,
    },
    "collection"
  )
  if (possibleTab) {
    tabs.setActiveTab(possibleTab.value.id)
  } else {
    tabs.createNewTab({
      type: "test-runner",
      collection: props.collection,
      isDirty: false,
      config: config.value,
      isRunning: false,
      request: null,
      initiateRunOnTabOpen: true,
      saveContext: {
        originLocation: "user-collection",
        folderPath: props.collectionIndex!,
      },
    })
  }

  emit("hide-modal")
}

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const activeEnvironment = computed(() => {
  const selectedEnv = props.selectedEnvironmentIndex

  if (selectedEnv.type === "TEAM_ENV") {
    return selectedEnv.environment.name
  }

  return null
})

const isCloudInstance = window.location.hostname === "hoppscotch.io"

const cliCommandGenerationDescription = computed(() => {
  if (isCloudInstance) {
    return t("collection_runner.cli_command_generation_description_cloud")
  }

  if (import.meta.env.VITE_BACKEND_API_URL) {
    return t("collection_runner.cli_command_generation_description_sh")
  }

  return t(
    "collection_runner.cli_command_generation_description_sh_with_server_url_placeholder"
  )
})

const generatedCLICommand = computed(() => {
  const { collectionID, environmentID } = props

  const environmentFlag =
    includeEnvironmentID.value && environmentID ? `-e ${environmentID}` : ""

  const serverUrl = import.meta.env.VITE_BACKEND_API_URL?.endsWith("/v1")
    ? // Removing `/v1` prefix
      import.meta.env.VITE_BACKEND_API_URL.slice(0, -3)
    : "<server_url>"

  const serverFlag = isCloudInstance ? "" : `--server ${serverUrl}`

  return `hopp test ${collectionID} ${environmentFlag} --token <access_token> ${serverFlag}`
})

const toggleIncludeEnvironment = () => {
  includeEnvironmentID.value = !includeEnvironmentID.value
}

const copyCLICommandToClipboard = () => {
  copyToClipboard(generatedCLICommand.value)
  copyIcon.value = IconCheck

  toast.success(`${t("state.copied_to_clipboard")}`)
}

const closeModal = () => {
  emit("hide-modal")
}
</script>
