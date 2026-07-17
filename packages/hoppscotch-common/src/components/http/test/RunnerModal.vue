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
                        t("collection_runner.dataset_rows", {
                          count: config.dataset.rows.length,
                        })
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
                <div class="flex gap-4 mt-4 items-center">
                  <HoppButtonSecondary
                    :label="t('collection_runner.select_data_file')"
                    outline
                    filled
                    @click="dataFileInput?.click()"
                  />
                </div>
              </template>
              <input
                ref="dataFileInput"
                class="hidden"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                :aria-label="t('collection_runner.select_data_file')"
                @change="handleDatasetFile"
              />
            </section>

            <section class="mt-6">
              <div class="flex items-center justify-between">
                <h4 class="font-semibold text-secondaryDark">
                  {{ t("collection_runner.requests_to_run") }}
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
                </div>
              </div>

              <div
                v-if="loadingCollection"
                class="flex justify-center mt-4 py-4"
              >
                <HoppSmartSpinner />
              </div>
              <div
                v-else-if="collectionTree"
                class="mt-4 max-h-64 overflow-auto rounded border border-divider bg-primaryLight px-3 py-2"
              >
                <HttpTestRunnerRequestSelector
                  :collection="collectionTree"
                  :selected-i-ds="selectedRequestIDs"
                  @toggle="toggleRequestSelection"
                />
              </div>
              <p
                v-if="collectionTree && selectedRequestIDs.size === 0"
                class="text-xs text-red-500 mt-1"
              >
                {{ t("collection_runner.no_requests_selected") }}
              </p>
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
              t("collection_runner.dataset_rows", {
                count: config.dataset.rows.length,
              })
            }}
          </span>
        </div>
        <pre
          class="p-4 overflow-auto rounded bg-primaryLight text-secondaryLight"
          >{{ JSON.stringify(config.dataset.rows, null, 2) }}</pre
        >
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

import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { useToast } from "~/composables/toast"
import { TestRunnerConfig } from "~/helpers/rest/document"
import { parseDatasetFile } from "~/helpers/runner/dataset"
import { getRequestSelectionID } from "~/helpers/runner/selection"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { RESTTabService } from "~/services/tab/rest"
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
const showDataPreview = ref(false)
const dataFileInput = ref<HTMLInputElement | null>(null)

const collectionTree = ref<HoppCollection | null>(null)
const selectedRequestIDs = ref<Set<string>>(new Set())

const collectRequestIDs = (
  collection: HoppCollection,
  parentPath: number[] = []
): string[] => [
  ...collection.requests.map((request, index) =>
    getRequestSelectionID(request as HoppRESTRequest, [...parentPath, index])
  ),
  ...collection.folders.flatMap((folder, index) =>
    collectRequestIDs(folder, [...parentPath, index])
  ),
]

const allRequestIDs = computed(() =>
  collectionTree.value ? collectRequestIDs(collectionTree.value) : []
)

const allSelected = computed(
  () =>
    allRequestIDs.value.length > 0 &&
    selectedRequestIDs.value.size === allRequestIDs.value.length
)

const toggleRequestSelection = (id: string) => {
  const next = new Set(selectedRequestIDs.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
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

onMounted(async () => {
  if (props.prevConfig) {
    config.value = { ...config.value, ...props.prevConfig }
  }

  const tree = await getCollectionTree(
    props.collectionRunnerData.type,
    props.collectionRunnerData.collectionID
  )

  if (tree) {
    collectionTree.value = tree as HoppCollection
    selectedRequestIDs.value = new Set(collectRequestIDs(collectionTree.value))
  }
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

const handleDatasetFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

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

  const selectedRequestRefIds = allSelected.value
    ? undefined
    : Array.from(selectedRequestIDs.value)

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
