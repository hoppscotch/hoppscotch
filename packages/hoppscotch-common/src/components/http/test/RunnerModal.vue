<template>
  <HoppSmartModal
    dialog
    :title="t('collection_runner.run_collection')"
    :full-width-body="true"
    @close="closeModal"
  >
    <template #body>
      <HoppSmartTabs v-model="activeTab">
        <HoppSmartTab id="gui" :label="t('collection_runner.ui')">
          <div
            class="flex-shrink-0 w-full h-full p-4 overflow-auto overflow-x-auto bg-primary"
          >
            <section>
              <h4 class="font-semibold text-secondaryDark">
                {{ t("collection_runner.run_config") }}
              </h4>
              <div class="mt-4 space-y-4">
                <!-- Iterations Input -->
                <HoppSmartInput
                  v-model="config.iterations as any"
                  type="number"
                  :label="t('test.iterations')"
                  class="!rounded-r-none !border-r-0"
                  :class="{ 'border-red-500': config.iterations < 1 }"
                  input-styles="floating-input !rounded-r-none !border-r-0"
                >
                  <template #button>
                    <span
                      class="px-4 py-2 font-semibold border rounded-r bg-primaryLight border-divider text-secondaryLight"
                    >
                      {{
                        config.iterations === 1
                          ? t("count.time")
                          : t("count.times")
                      }}
                    </span>
                  </template>
                </HoppSmartInput>
                <p
                  v-if="config.iterations < 1"
                  class="text-xs text-red-500 mt-1"
                >
                  {{ t("collection_runner.invalid_iterations") }}
                </p>
                <p
                  v-if="datasetEnabled && datasetRowCount > 0"
                  class="text-xs text-secondaryLight"
                >
                  <span v-if="config.iterations <= datasetRowCount">
                    {{
                      t("collection_runner.dataset_iterations_info", {
                        iterations: config.iterations,
                        rows: datasetRowCount,
                        total: config.iterations * datasetRowCount,
                      })
                    }}
                  </span>
                  <span v-else>
                    {{
                      t("collection_runner.dataset_iterations_exceeds", {
                        iterations: config.iterations,
                        rows: datasetRowCount,
                        extra: config.iterations - datasetRowCount,
                      })
                    }}
                  </span>
                </p>

                <!-- Data Feed Section (Postman Style) -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-secondaryDark">
                      {{ t("collection_runner.data_feed") }}
                    </label>
                  </div>

                  <div v-if="!datasetEnabled" class="space-y-2">
                    <div class="flex gap-2">
                      <label
                        class="flex items-center justify-center px-4 py-2 text-sm border rounded cursor-pointer border-divider hover:bg-primaryLight transition"
                      >
                        <input
                          ref="csvFileInput"
                          type="file"
                          accept=".csv"
                          class="hidden"
                          @change="handleFileUpload($event, 'csv')"
                        />
                        <span>{{ t("collection_runner.select_csv") }}</span>
                      </label>

                      <label
                        class="flex items-center justify-center px-4 py-2 text-sm border rounded cursor-pointer border-divider hover:bg-primaryLight transition"
                      >
                        <input
                          ref="jsonFileInput"
                          type="file"
                          accept=".json"
                          class="hidden"
                          @change="handleFileUpload($event, 'json')"
                        />
                        <span>{{ t("collection_runner.select_json") }}</span>
                      </label>
                    </div>
                  </div>

                  <div
                    v-else
                    class="p-3 border rounded bg-primaryLight border-divider space-y-2"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 text-sm">
                        <span class="font-medium text-secondaryDark">{{
                          datasetFileName
                        }}</span>
                        <span class="text-secondaryLight">•</span>
                        <span class="text-secondaryLight">{{
                          datasetSource?.toUpperCase()
                        }}</span>
                        <span class="text-secondaryLight">•</span>
                        <span class="text-accent"
                          >{{ datasetRowCount }}
                          {{
                            datasetRowCount === 1
                              ? t("collection_runner.row")
                              : t("collection_runner.rows")
                          }}</span
                        >
                      </div>
                      <div class="flex items-center gap-2">
                        <HoppButtonSecondary
                          v-tippy="{ theme: 'tooltip' }"
                          :title="t('collection_runner.preview_data')"
                          :icon="IconEye"
                          class="!py-1 !px-2"
                          outline
                          @click="showPreviewModal = true"
                        />
                        <HoppButtonSecondary
                          v-tippy="{ theme: 'tooltip' }"
                          :title="t('action.remove')"
                          :icon="IconTrash"
                          class="!py-1 !px-2"
                          outline
                          @click="clearDataset"
                        />
                      </div>
                    </div>
                    <p class="text-xs text-accent">
                      {{
                        t("collection_runner.iterations_from_data", {
                          count: datasetRowCount,
                        })
                      }}
                    </p>
                  </div>
                </div>

                <!-- Delay Input -->
                <HoppSmartInput
                  v-model="config.delay as any"
                  type="number"
                  :label="t('collection_runner.delay')"
                  class="!rounded-r-none !border-r-0"
                  :class="{ 'border-red-500': config.delay < 0 }"
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
                <p v-if="config.delay < 0" class="text-xs text-red-500 mt-1">
                  {{ t("collection_runner.negative_delay") }}
                </p>
              </div>
            </section>

            <section class="mt-6">
              <span class="text-xs text-secondaryLight">
                {{ t("collection_runner.advanced_settings") }}
              </span>

              <div class="flex flex-col gap-4 mt-4 items-start">
                <HoppSmartCheckbox
                  class="pr-2"
                  :on="config.stopOnError"
                  @change="config.stopOnError = !config.stopOnError"
                >
                  <span>
                    {{ t("collection_runner.stop_on_error") }}
                  </span>
                </HoppSmartCheckbox>

                <HoppSmartCheckbox
                  class="pr-2"
                  :on="config.persistResponses"
                  @change="config.persistResponses = !config.persistResponses"
                >
                  <span>
                    {{ t("collection_runner.persist_responses") }}
                  </span>
                </HoppSmartCheckbox>

                <HoppSmartCheckbox
                  class="pr-2"
                  :on="config.keepVariableValues"
                  @change="
                    config.keepVariableValues = !config.keepVariableValues
                  "
                >
                  <span>
                    {{ t("collection_runner.keep_variable_values") }}
                  </span>
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    class="!py-0 pl-2"
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
          <div v-if="!CLICommand" class="p-4">
            <p class="p-4 border rounded-md text-amber-500 border-amber-600">
              {{
                t("collection_runner.cli_comming_soon_for_personal_collection")
              }}
            </p>
          </div>
          <template v-else>
            <HttpTestEnv :show="false" @select-env="setCurrentEnv" />

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
                  <span class="text-secondaryDark">
                    {{ currentEnv?.name }}
                  </span>
                </span>
              </div>

              <div
                class="p-4 rounded-md bg-primaryLight text-secondaryDark select-text"
              >
                {{ CLICommand }}
              </div>
            </div>
          </template>
        </HoppSmartTab>
        <template #actions>
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            class="!py-0 pl-2"
            :to="runnerLink"
            blank
            :title="t('app.wiki')"
            :icon="IconHelpCircle"
          />
        </template>
      </HoppSmartTabs>
    </template>

    <template #footer>
      <div class="flex space-x-2">
        <HoppButtonPrimary
          v-if="activeTab === 'gui'"
          :label="`${t('test.run')}`"
          :disabled="config.delay < 0 || config.iterations < 1"
          :loading="loadingCollection"
          :icon="IconPlay"
          outline
          @click="runTests"
        />
        <HoppButtonPrimary
          v-else-if="CLICommand"
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

  <!-- Data Preview Modal -->
  <HoppSmartModal
    v-if="showPreviewModal"
    dialog
    :title="t('collection_runner.data_preview')"
    @close="showPreviewModal = false"
  >
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium text-secondaryDark">{{
              datasetFileName
            }}</span>
            <span class="text-secondaryLight">•</span>
            <span class="text-secondaryLight">{{
              datasetSource?.toUpperCase()
            }}</span>
            <span class="text-secondaryLight">•</span>
            <span class="text-accent"
              >{{ datasetRowCount }}
              {{
                datasetRowCount === 1
                  ? t("collection_runner.row")
                  : t("collection_runner.rows")
              }}</span
            >
          </div>
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.download_file')"
            :icon="IconDownload"
            outline
            @click="downloadDataset"
          />
        </div>

        <div class="border rounded bg-primaryLight border-divider">
          <div class="overflow-auto max-h-96 p-4">
            <pre
              class="text-xs"
            ><code>{{ JSON.stringify(datasetData, null, 2) }}</code></pre>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <HoppButtonSecondary
        :label="t('action.close')"
        outline
        filled
        @click="showPreviewModal = false"
      />
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { refAutoReset } from "@vueuse/core"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"

import { HoppCollection } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { useToast } from "~/composables/toast"
import { TestRunnerConfig } from "~/helpers/rest/document"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { RESTTabService } from "~/services/tab/rest"
import {
  parseCSV,
  parseJSON,
  validateDataset,
} from "~/helpers/import-export/dataset/parser"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconPlay from "~icons/lucide/play"
import IconDownload from "~icons/lucide/download"
import IconEye from "~icons/lucide/eye"
import IconTrash from "~icons/lucide/trash-2"
import { CurrentEnv } from "./Env.vue"
import { pipe } from "fp-ts/lib/function"
import {
  getCompleteCollectionTree,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import * as TE from "fp-ts/TaskEither"
import { GQLError } from "~/helpers/backend/GQLClient"
import { cloneDeep } from "lodash-es"
import { getErrorMessage } from "~/helpers/runner/collection-tree"
import { getRESTCollectionByRefId } from "~/newstore/collections"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

const t = useI18n()
const toast = useToast()
const tabs = useService(RESTTabService)

const loadingCollection = ref(false)

export type CollectionRunnerData =
  | {
      type: "my-collections"
      // for my-collections it's actually _ref_id
      collectionID: string
      collectionIndex?: string
    }
  | {
      type: "team-collections"
      collectionID: string
      inheritedProperties?: HoppInheritedProperty
    }

const props = defineProps<{
  sameTab?: boolean
  collectionRunnerData: CollectionRunnerData
  prevConfig?: Partial<TestRunnerConfig>
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const includeEnvironmentID = ref(false)
const activeTab = ref<"gui" | "cli">("gui")

const environmentID = ref("")
const currentEnv = ref<CurrentEnv>(null)

const runnerLink = computed(() => {
  return activeTab.value === "gui"
    ? "https://docs.hoppscotch.io/documentation/features/runner#runner"
    : "https://docs.hoppscotch.io/documentation/clients/cli/overview#running-collections-present-on-the-api-client"
})

function setCurrentEnv(payload: CurrentEnv) {
  currentEnv.value = payload
  if (payload?.type === "TEAM_ENV") {
    environmentID.value = payload.teamEnvID
  }
}

const config = ref<TestRunnerConfig>({
  iterations: 1,
  delay: 500,
  stopOnError: false,
  persistResponses: true,
  keepVariableValues: true,
})

onMounted(async () => {
  if (props.prevConfig) {
    config.value = { ...config.value, ...props.prevConfig }
  }
})

const runTests = async () => {
  const collectionTree = await getCollectionTree(
    props.collectionRunnerData.type,
    props.collectionRunnerData.collectionID
  )

  if (!collectionTree) {
    toast.error(t("collection_runner.collection_not_found"))
    return
  }

  if (checkIfCollectionIsEmpty(collectionTree)) {
    toast.error(t("collection_runner.empty_collection"))
    return
  }

  let tabIdToClose = null
  if (props.sameTab) tabIdToClose = cloneDeep(tabs.currentTabID.value)
  tabs.createNewTab({
    type: "test-runner",
    collectionType: props.collectionRunnerData.type,
    collectionID: props.collectionRunnerData.collectionID,
    collection: collectionTree as HoppCollection,
    isDirty: false,
    config: config.value,
    status: "idle",
    request: null,
    testRunnerMeta: {
      completedRequests: 0,
      totalRequests: 0,
      totalTime: 0,
      failedTests: 0,
      passedTests: 0,
      totalTests: 0,
    },
    inheritedProperties:
      "inheritedProperties" in props.collectionRunnerData
        ? props.collectionRunnerData.inheritedProperties
        : undefined,
  })

  if (tabIdToClose) tabs.closeTab(tabIdToClose)

  emit("hide-modal")
}

/**
 * Fetches the collection tree from the backend
 * @param type The collection type
 * @param collectionID The collection ID
 * @returns collection tree
 */
const getCollectionTree = async (
  type: CollectionRunnerData["type"],
  collectionID: string
) => {
  if (!collectionID) return
  if (type === "my-collections") {
    return await getRESTCollectionByRefId(collectionID)
  }
  loadingCollection.value = true
  return pipe(
    getCompleteCollectionTree(collectionID),
    TE.match(
      (err: GQLError<string>) => {
        toast.error(`${getErrorMessage(err, t)}`)
        loadingCollection.value = false
        return
      },
      async (coll) => {
        loadingCollection.value = false
        return teamCollToHoppRESTColl(coll)
      }
    )
  )()
}

function checkIfCollectionIsEmpty(collection: HoppCollection): boolean {
  // Check if the collection has requests or if any child collection is non-empty
  return (
    collection.requests.length === 0 &&
    collection.folders.every((folder) => checkIfCollectionIsEmpty(folder))
  )
}

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

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

const CLICommand = computed(() => {
  if (props.collectionRunnerData.type === "team-collections") {
    const collectionID = props.collectionRunnerData.collectionID
    const environmentFlag =
      includeEnvironmentID.value && environmentID.value
        ? `-e ${environmentID.value}`
        : ""

    const serverUrl = import.meta.env.VITE_BACKEND_API_URL?.endsWith("/v1")
      ? // Removing `/v1` prefix
        import.meta.env.VITE_BACKEND_API_URL.slice(0, -3)
      : "<server_url>"

    const serverFlag = isCloudInstance ? "" : `--server ${serverUrl}`

    return `hopp test ${collectionID} ${environmentFlag} --token <access_token> ${serverFlag}`
  }

  return null
})

const toggleIncludeEnvironment = () => {
  includeEnvironmentID.value = !includeEnvironmentID.value
}

const copyCLICommandToClipboard = () => {
  copyToClipboard(CLICommand.value ?? "")
  copyIcon.value = IconCheck

  toast.success(`${t("state.copied_to_clipboard")}`)
}

const closeModal = () => {
  emit("hide-modal")
}

const datasetEnabled = ref(false)
const datasetData = ref<any[]>([])
const datasetSource = ref<string | null>(null)
const datasetFileName = ref<string | null>(null)
const datasetRawContent = ref<string | null>(null)
const showPreviewModal = ref(false)

const handleFileUpload = (event: Event, type: "csv" | "json") => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const contents = e.target?.result

    if (typeof contents === "string") {
      try {
        const parsedData =
          type === "csv" ? parseCSV(contents) : parseJSON(contents)

        // Validate the parsed data
        if (!validateDataset(parsedData)) {
          throw new Error("Invalid dataset structure")
        }

        datasetData.value = parsedData
        datasetSource.value = type === "csv" ? "CSV" : "JSON"
        datasetFileName.value = file.name
        datasetRawContent.value = contents
        datasetEnabled.value = true

        // Automatically set iterations to match dataset row count
        config.value.iterations = parsedData.length

        toast.success(t("collection_runner.dataset_loaded"))
      } catch (error) {
        const errorMsg =
          type === "csv"
            ? t("collection_runner.invalid_csv")
            : t("collection_runner.invalid_json")
        toast.error(errorMsg)
      }
    }
  }

  reader.readAsText(file)

  target.value = ""
}

const clearDataset = () => {
  datasetData.value = []
  datasetSource.value = null
  datasetEnabled.value = false
  datasetFileName.value = null
  datasetRawContent.value = null
}

const downloadDataset = () => {
  if (!datasetRawContent.value) return

  const blob = new Blob([datasetRawContent.value], {
    type: datasetSource.value === "CSV" ? "text/csv" : "application/json",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download =
    datasetFileName.value ||
    `dataset.${datasetSource.value?.toLowerCase() || "txt"}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success(t("state.download_started"))
}

const datasetRowCount = computed(() => datasetData.value.length)

watch(
  [datasetEnabled, datasetData, datasetRawContent, datasetFileName],
  () => {
    if (datasetEnabled.value && datasetData.value.length > 0) {
      config.value.dataset = {
        enabled: true,
        data: datasetData.value,
        source:
          (datasetSource.value?.toLowerCase() as "json" | "csv") || "json",
        rawContent: datasetRawContent.value || undefined,
        fileName: datasetFileName.value || undefined,
      }
    } else {
      config.value.dataset = {
        enabled: false,
        data: [],
        source: "json",
        rawContent: undefined,
        fileName: undefined,
      }
    }
  }
)
</script>
