<template>
  <HoppSmartModal
    dialog
    :title="t('collection_runner.run_collection')"
    :full-width-body="true"
    styles="sm:max-w-6xl xl:max-w-7xl 2xl:max-w-[80vw]"
    @close="closeModal"
  >
    <template #body>
      <HoppSmartTabs v-model="activeTab">
        <HoppSmartTab id="gui" :label="t('collection_runner.ui')">
          <div
            class="flex flex-col w-full bg-primary lg:flex-row lg:h-[calc(60vh_-_2.0625rem)] lg:min-h-0"
          >
            <div
              class="flex-1 min-w-0 p-4 overflow-y-auto lg:border-r border-divider"
            >
              <section>
                <h4 class="font-semibold text-secondaryDark">
                  {{ t("collection_runner.run_config") }}
                </h4>
                <div class="mt-4">
                  <HoppSmartInput
                    v-model="config.iterations as any"
                    type="number"
                    :label="t('collection_runner.iterations')"
                    :disabled="!!config.dataset"
                    class="!rounded-r-none !border-r-0"
                    :class="{ 'border-red-500': config.iterations < 1 }"
                    input-styles="floating-input !rounded-r-none !border-r-0"
                  >
                    <template #button>
                      <span
                        class="px-4 py-2 font-semibold border rounded-r bg-primaryLight border-divider text-secondaryLight"
                      >
                        {{
                          Number(config.iterations) === 1
                            ? t("collection_runner.time")
                            : t("collection_runner.times")
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
                    v-else-if="config.dataset"
                    class="text-xs text-secondaryLight mt-1"
                  >
                    {{ t("collection_runner.iterations_locked_to_dataset") }}
                  </p>
                </div>
              </section>

              <section class="mt-6">
                <h4 class="font-semibold text-secondaryDark">
                  {{ t("collection_runner.data_feed") }}
                </h4>
                <template v-if="config.dataset">
                  <div
                    class="mt-4 p-4 rounded border border-divider bg-primaryLight"
                  >
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-secondaryDark">
                        {{ config.dataset.fileName }}
                      </span>
                      <span class="text-secondaryLight">•</span>
                      <span class="font-semibold text-secondaryLight uppercase">
                        {{ config.dataset.type }}
                      </span>
                      <span class="text-secondaryLight">•</span>
                      <span class="text-accent">
                        {{
                          t(
                            config.dataset.rows.length === 1
                              ? "collection_runner.dataset_row"
                              : "collection_runner.dataset_rows",
                            { count: config.dataset.rows.length }
                          )
                        }}
                      </span>
                      <span class="flex-1"></span>
                      <HoppButtonSecondary
                        v-tippy="{ theme: 'tooltip' }"
                        :title="t('collection_runner.data_preview')"
                        :icon="IconEye"
                        outline
                        @click="showDataPreview = true"
                      />
                      <HoppButtonSecondary
                        v-tippy="{ theme: 'tooltip' }"
                        :title="t('collection_runner.remove_file')"
                        :icon="IconTrash"
                        outline
                        @click="removeDataset"
                      />
                    </div>
                    <p class="mt-2 text-accent">
                      {{
                        t("collection_runner.dataset_iterations_info", {
                          rows: config.dataset.rows.length,
                          total: config.iterations,
                        })
                      }}
                    </p>
                  </div>
                </template>
                <template v-else>
                  <p class="mt-1 text-secondaryLight">
                    {{ t("collection_runner.data_feed_help") }}
                  </p>
                  <div
                    class="flex flex-col mt-3 border border-dashed rounded border-dividerDark"
                  >
                    <input
                      ref="dataFileInput"
                      type="file"
                      class="p-4 cursor-pointer transition file:transition file:cursor-pointer text-secondary hover:text-secondaryDark file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-secondary hover:file:text-secondaryDark file:bg-primaryLight hover:file:bg-primaryDark"
                      accept=".csv,.json,text/csv,application/json"
                      :aria-label="t('collection_runner.select_data_file')"
                      @change="handleDatasetFile"
                    />
                  </div>
                </template>
              </section>

              <section class="mt-6">
                <div>
                  <!-- TODO: fix input component types. so that it accepts number -->
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

            <div class="flex flex-col flex-1 min-w-0 min-h-0 p-4">
              <div class="flex items-center justify-between flex-shrink-0">
                <h4 class="font-semibold text-secondaryDark">
                  {{ t("collection_runner.run_sequence") }}
                </h4>
                <div v-if="collectionTree" class="flex items-center gap-2">
                  <span class="text-xs text-secondaryLight">
                    {{
                      t("collection_runner.selected_requests_count", {
                        selected: selectedRequestIDs.size,
                        total: allRequestIDs.length,
                      })
                    }}
                  </span>
                  <HoppButtonSecondary
                    :label="
                      allSelected
                        ? t('collection_runner.deselect_all')
                        : t('collection_runner.select_all')
                    "
                    outline
                    filled
                    @click="toggleSelectAll"
                  />
                  <HoppButtonSecondary
                    :label="t('collection_runner.reset_run_order')"
                    :disabled="requestOrder.length === 0"
                    outline
                    filled
                    @click="resetRunOrder"
                  />
                </div>
              </div>

              <div
                v-if="loadingCollection"
                class="flex justify-center mt-4 py-4"
              >
                <HoppSmartSpinner />
              </div>
              <div
                v-else-if="collectionLoadFailed"
                class="flex items-center justify-between gap-4 mt-4 p-4 rounded border border-divider bg-primaryLight"
              >
                <span class="text-secondaryLight">
                  {{ t("collection_runner.collection_load_failed") }}
                </span>
                <HoppButtonSecondary
                  :label="t('action.retry')"
                  outline
                  filled
                  @click="loadCollectionTree"
                />
              </div>
              <template v-else-if="collectionTree">
                <HoppSmartInput
                  v-model="requestFilter"
                  class="mt-4 flex-shrink-0"
                  :placeholder="t('collection_runner.filter_requests')"
                />
                <div
                  class="flex-1 min-h-0 mt-2 max-h-64 lg:max-h-none overflow-auto rounded border border-divider bg-primaryLight px-3 py-2"
                >
                  <HttpTestRunnerRequestSelector
                    :collection="collectionTree"
                    :selected-i-ds="selectedRequestIDs"
                    :order="requestOrder"
                    :filter="requestFilter"
                    @toggle="toggleRequestSelection"
                    @reorder="requestOrder = $event"
                  />
                </div>
              </template>
              <p
                v-if="collectionTree && selectedRequestIDs.size === 0"
                class="flex-shrink-0 text-xs text-red-500 mt-1"
              >
                {{ t("collection_runner.no_requests_selected") }}
              </p>
            </div>
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
          :disabled="
            config.delay < 0 ||
            config.iterations < 1 ||
            !collectionTree ||
            selectedRequestIDs.size === 0
          "
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

  <HoppSmartModal
    v-if="showDataPreview && config.dataset"
    dialog
    :title="t('collection_runner.data_preview')"
    @close="showDataPreview = false"
  >
    <template #body>
      <div class="p-4">
        <div class="flex items-center gap-2 mb-4">
          <span class="font-semibold text-secondaryDark">
            {{ config.dataset.fileName }}
          </span>
          <span class="text-secondaryLight">•</span>
          <span class="font-semibold text-secondaryLight uppercase">
            {{ config.dataset.type }}
          </span>
          <span class="text-secondaryLight">•</span>
          <span class="text-accent">
            {{
              t(
                config.dataset.rows.length === 1
                  ? "collection_runner.dataset_row"
                  : "collection_runner.dataset_rows",
                { count: config.dataset.rows.length }
              )
            }}
          </span>
        </div>
        <div class="overflow-auto rounded border border-divider">
          <table class="w-full text-left border-collapse">
            <thead class="bg-primaryLight">
              <tr>
                <th
                  class="px-3 py-2 text-tiny font-semibold text-secondaryLight border-b border-divider"
                >
                  #
                </th>
                <th
                  v-for="column in datasetColumns"
                  :key="column"
                  class="px-3 py-2 text-tiny font-semibold text-secondaryDark border-b border-divider whitespace-nowrap"
                >
                  {{ column }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, rowIndex) in datasetPreviewRows"
                :key="rowIndex"
                class="border-b border-dividerLight last:border-0"
              >
                <td class="px-3 py-2 text-tiny text-secondaryLight">
                  {{ rowIndex + 1 }}
                </td>
                <td
                  v-for="column in datasetColumns"
                  :key="column"
                  class="px-3 py-2 text-secondaryDark align-top"
                >
                  {{ row[column] ?? "" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-if="datasetPreviewTruncated"
          class="mt-2 text-tiny text-secondaryLight"
        >
          {{
            t("collection_runner.dataset_preview_truncated", {
              count: DATASET_PREVIEW_ROW_CAP,
            })
          }}
        </p>
      </div>
    </template>
    <template #footer>
      <HoppButtonSecondary
        :label="`${t('action.close')}`"
        outline
        filled
        @click="showDataPreview = false"
      />
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { refAutoReset } from "@vueuse/core"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "~/composables/i18n"

import { HoppCollection } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { useToast } from "~/composables/toast"
import { TestRunnerConfig } from "~/helpers/rest/document"
import { parseDatasetFile } from "~/helpers/runner/dataset"
import { collectRequestIDs } from "~/helpers/runner/selection"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconEye from "~icons/lucide/eye"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconPlay from "~icons/lucide/play"
import IconTrash from "~icons/lucide/trash"
import { CurrentEnv } from "./Env.vue"
import { pipe } from "fp-ts/lib/function"
import {
  getCompleteCollectionTree,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { GQLError } from "~/helpers/backend/GQLClient"
import { cloneDeep } from "lodash-es"
import { getErrorMessage } from "~/helpers/runner/collection-tree"
import { getRESTCollectionByRefId } from "~/newstore/collections"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

const t = useI18n()
const toast = useToast()
const tabs = useService(WorkspaceTabsService)

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
  /**
   * The previous run's selection, in run order — carried over so a new run
   * keeps the sequence the user arranged.
   */
  prevSelection?: string[]
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const includeEnvironmentID = ref(false)
const activeTab = ref<"gui" | "cli">("gui")

const environmentID = ref("")
const currentEnv = ref<CurrentEnv>(null)
const showDataPreview = ref(false)
const dataFileInput = ref<HTMLInputElement | null>(null)

const collectionTree = ref<HoppCollection | null>(null)
const selectedRequestIDs = ref<Set<string>>(new Set())
const requestFilter = ref("")

// Explicit run order as selection IDs. Empty means "natural collection
// order", which is also what Reset restores.
const requestOrder = ref<string[]>([])

const resetRunOrder = () => {
  requestOrder.value = []
}

const allRequestIDs = computed(() =>
  collectionTree.value ? collectRequestIDs(collectionTree.value) : []
)

const allSelected = computed(
  () =>
    allRequestIDs.value.length > 0 &&
    selectedRequestIDs.value.size === allRequestIDs.value.length
)

// Same rule the selector displays by: the user's explicit order first, then
// anything it doesn't mention in natural order.
const orderedRequestIDs = computed(() => {
  if (requestOrder.value.length === 0) return allRequestIDs.value

  const available = new Set(allRequestIDs.value)
  const ordered = requestOrder.value.filter((id) => available.has(id))
  const seen = new Set(ordered)

  return [...ordered, ...allRequestIDs.value.filter((id) => !seen.has(id))]
})

// Receives a whole subtree at once, so a folder toggle rebuilds the Set once.
const toggleRequestSelection = (ids: string[], select: boolean) => {
  const next = new Set(selectedRequestIDs.value)
  ids.forEach((id) => (select ? next.add(id) : next.delete(id)))
  selectedRequestIDs.value = next
}

const toggleSelectAll = () => {
  selectedRequestIDs.value = allSelected.value
    ? new Set()
    : new Set(allRequestIDs.value)
}

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

// Cap the data-preview so a large dataset doesn't stringify thousands of rows
// into the DOM on every render. Computed once, and only while the preview is open.
const DATASET_PREVIEW_ROW_CAP = 50

const datasetPreviewRows = computed(() =>
  (config.value.dataset?.rows ?? []).slice(0, DATASET_PREVIEW_ROW_CAP)
)

// Union of keys across the previewed rows — JSON rows need not be uniform.
const datasetColumns = computed(() => {
  const columns = new Set<string>()
  datasetPreviewRows.value.forEach((row) =>
    Object.keys(row).forEach((key) => columns.add(key))
  )
  return [...columns]
})

const datasetPreviewTruncated = computed(
  () => (config.value.dataset?.rows.length ?? 0) > DATASET_PREVIEW_ROW_CAP
)

// The tree fetch can fail (a network call for team collections) and the run
// controls key off `collectionTree` — a failure must stay recoverable.
const collectionLoadFailed = ref(false)

const loadCollectionTree = async () => {
  collectionLoadFailed.value = false

  const tree = await getCollectionTree(
    props.collectionRunnerData.type,
    props.collectionRunnerData.collectionID
  )

  if (!tree) {
    collectionLoadFailed.value = true
    return
  }

  collectionTree.value = tree as HoppCollection

  const available = collectRequestIDs(collectionTree.value)

  // Carry over the previous run's selection, dropping anything that no
  // longer exists in the tree; everything selected otherwise.
  const carriedOver = (props.prevSelection ?? []).filter((id) =>
    available.includes(id)
  )

  if (carriedOver.length > 0) {
    selectedRequestIDs.value = new Set(carriedOver)

    // Only install an explicit order when the previous run actually had one:
    // a selection in natural order is just "which requests", and treating it
    // as an ordering would pin re-checked requests to the end of the run.
    const naturalPosition = new Map(available.map((id, index) => [id, index]))
    const isNaturalOrder = carriedOver.every(
      (id, index) =>
        index === 0 ||
        naturalPosition.get(id)! > naturalPosition.get(carriedOver[index - 1])!
    )

    requestOrder.value = isNaturalOrder ? [] : carriedOver
    return
  }

  selectedRequestIDs.value = new Set(available)
  requestOrder.value = []
}

onMounted(async () => {
  if (props.prevConfig) {
    config.value = { ...config.value, ...props.prevConfig }
  }

  await loadCollectionTree()
})

const resetFileInputs = () => {
  if (dataFileInput.value) dataFileInput.value.value = ""
}

const removeDataset = () => {
  config.value.dataset = undefined
  config.value.iterations = 1
  showDataPreview.value = false
  resetFileInputs()
}

// The parsed rows are stored on the (persisted) tab document, which shares
// the ~5MB localStorage quota with every other REST tab — and CSV rows
// expand when re-serialized as keyed JSON objects. 2MB (roughly 20-40k
// rows, i.e. iterations) keeps the worst case comfortably inside the quota.
const DATA_FILE_SIZE_LIMIT_MB = 2

const handleDatasetFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  if (file.size > DATA_FILE_SIZE_LIMIT_MB * 1024 * 1024) {
    toast.error(
      t("collection_runner.data_file_size_limit_exceeded", {
        sizeLimit: DATA_FILE_SIZE_LIMIT_MB,
      })
    )
    resetFileInputs()
    return
  }

  const result = await parseDatasetFile(file)

  if (E.isLeft(result)) {
    toast.error(`${t("collection_runner.invalid_data_file")}: ${result.left}`)
    resetFileInputs()
    return
  }

  if (result.right.rows.length === 0) {
    toast.error(t("collection_runner.empty_data_file"))
    resetFileInputs()
    return
  }

  // What persists is the PARSED rows, and a wide CSV balloons once column
  // names repeat per row — so the raw-file gate above isn't enough; gate the
  // serialized size the tab state will actually carry.
  if (
    JSON.stringify(result.right.rows).length >
    DATA_FILE_SIZE_LIMIT_MB * 1024 * 1024
  ) {
    toast.error(
      t("collection_runner.data_file_size_limit_exceeded", {
        sizeLimit: DATA_FILE_SIZE_LIMIT_MB,
      })
    )
    resetFileInputs()
    return
  }

  config.value.dataset = result.right
  config.value.iterations = result.right.rows.length
  resetFileInputs()
}

const runTests = async () => {
  const iterations = Number(config.value.iterations)
  const delay = Number(config.value.delay)

  if (!Number.isFinite(iterations) || iterations < 1) {
    toast.error(t("collection_runner.invalid_iterations"))
    return
  }

  if (!Number.isFinite(delay) || delay < 0) {
    toast.error(t("collection_runner.negative_delay"))
    return
  }

  const tree =
    collectionTree.value ??
    ((await getCollectionTree(
      props.collectionRunnerData.type,
      props.collectionRunnerData.collectionID
    )) as HoppCollection | null)

  if (!tree) {
    toast.error(t("collection_runner.collection_not_found"))
    return
  }

  if (checkIfCollectionIsEmpty(tree)) {
    toast.error(t("collection_runner.empty_collection"))
    return
  }

  if (selectedRequestIDs.value.size === 0) {
    toast.error(t("collection_runner.no_requests_selected"))
    return
  }

  // `undefined` means "everything, in collection order"; otherwise send the
  // explicit run order, which the runner executes in exactly this order.
  const selectedRequestRefIds =
    allSelected.value && requestOrder.value.length === 0
      ? undefined
      : orderedRequestIDs.value.filter((id) => selectedRequestIDs.value.has(id))

  let tabIdToClose = null
  if (props.sameTab) tabIdToClose = cloneDeep(tabs.currentTabID.value)
  tabs.createNewTab({
    type: "test-runner",
    collectionType: props.collectionRunnerData.type,
    collectionID: props.collectionRunnerData.collectionID,
    collection: tree,
    isDirty: false,
    config: {
      ...config.value,
      iterations,
      delay,
    },
    selectedRequestRefIds,
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
 * @param collection
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
</script>
