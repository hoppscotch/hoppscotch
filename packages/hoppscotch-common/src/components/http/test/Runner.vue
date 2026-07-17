<template>
  <AppPaneLayout layout-id="test-runner-primary">
    <template #primary>
      <div
        class="flex flex-col"
        :style="
          headerHeight
            ? { '--upper-runner-sticky-fold': `${headerHeight}px` }
            : undefined
        "
      >
        <div
          ref="headerEl"
          class="flex flex-col flex-shrink-0 bg-primary sticky top-0 z-20"
        >
          <div class="flex items-center gap-4 px-4 pt-4">
            <HttpTestRunnerMeta
              class="min-w-0 flex-1"
              :heading="t('collection.title')"
              :text="collectionName"
            />
            <div class="flex items-center gap-2 flex-shrink-0">
              <HoppButtonPrimary
                v-if="showResult && tab.document.status === 'running'"
                :label="t('test.stop')"
                @click="stopTests()"
              />
              <HoppButtonPrimary
                v-else
                :label="t('test.run_again')"
                @click="runAgain()"
              />
              <HoppButtonSecondary
                v-if="showResult && tab.document.status !== 'running'"
                :icon="IconPlus"
                :label="t('test.new_run')"
                filled
                outline
                @click="newRun()"
              />
              <HoppButtonSecondary
                v-if="canExport"
                :icon="IconDownload"
                :label="t('collection_runner.export_results')"
                filled
                outline
                @click="exportResults('all')"
              />
            </div>
          </div>

          <div v-if="showResult" class="flex gap-8 px-4 py-4 overflow-x-auto">
            <HttpTestRunnerMeta
              :heading="t('environment.heading')"
              :text="runEnvironmentName"
            />
            <HttpTestRunnerMeta
              :heading="t('test.iterations')"
              :text="iterationResults.length.toString()"
            />
            <HttpTestRunnerMeta
              :heading="t('test.duration')"
              :text="duration ? msToHumanReadable(duration) : '...'"
            />
            <HttpTestRunnerMeta
              :heading="t('test.avg_resp')"
              :text="
                avgResponseTime ? msToHumanReadable(avgResponseTime) : '...'
              "
            />
            <HttpTestRunnerMeta
              v-if="
                iterationResults.length > 1 && tab.document.status !== 'running'
              "
              class="ml-auto"
              :heading="t('test.iterations')"
            >
              <select
                v-model.number="jumpToIteration"
                class="bg-primaryLight text-secondaryDark font-bold text-sm rounded border border-divider px-1 py-0.5 cursor-pointer focus:outline-none"
              >
                <option :value="0" disabled>
                  {{ t("collection_runner.jump_to_iteration") }}
                </option>
                <option
                  v-for="{ iteration } in iterationAdapters"
                  :key="iteration"
                  :value="iteration"
                >
                  {{ t("collection_runner.iteration", { count: iteration }) }}
                </option>
              </select>
            </HttpTestRunnerMeta>
          </div>
        </div>

        <HttpTestRunnerResult
          v-if="showResult"
          :tab="tab"
          :iteration-adapters="iterationAdapters"
          :is-running="tab.document.status === 'running'"
          :selected-request-path="selectedRequestPath"
          :jump-to-iteration="jumpToIteration"
          @on-change-tab="showTestsType = $event as 'all' | 'passed' | 'failed'"
          @on-select-request="onSelectRequest"
          @request-path="onChangeRequestPath"
          @jumped="jumpToIteration = 0"
        />
      </div>
    </template>
    <template #secondary>
      <div
        v-if="tab.document.status === 'running'"
        class="flex flex-col items-center gap-4 justify-center h-full"
      >
        <HoppSmartSpinner />
        <span> {{ t("collection_runner.running_collection") }}... </span>
      </div>
      <HttpTestResponse
        v-else-if="selectedRequest && selectedRequest.response"
        v-model:document="selectedRequest"
        :show-response="tab.document.config.persistResponses"
      />

      <HoppSmartPlaceholder
        v-else-if="
          !testRunnerConfig.persistResponses && !selectedRequest?.response
        "
        :src="`/images/states/${colorMode.value}/add_files.svg`"
        :alt="`${t('collection_runner.no_response_persist')}`"
        :text="`${t('collection_runner.no_response_persist')}`"
      >
        <template #body>
          <HoppButtonPrimary
            :label="t('test.new_run')"
            @click="showCollectionsRunnerModal = true"
          />
        </template>
      </HoppSmartPlaceholder>

      <HoppSmartPlaceholder
        v-else-if="!selectedRequest"
        :src="`/images/states/${colorMode.value}/pack.svg`"
        :alt="`${t('collection_runner.response_body_lost_rerun')}`"
        :text="`${t('collection_runner.response_body_lost_rerun')}`"
      >
      </HoppSmartPlaceholder>
    </template>
  </AppPaneLayout>

  <HttpTestRunnerModal
    v-if="showCollectionsRunnerModal"
    :same-tab="true"
    :collection-runner-data="
      tab.document.collectionType === 'my-collections'
        ? {
            type: 'my-collections',
            collectionID: tab.document.collectionID,
          }
        : {
            type: 'team-collections',
            collectionID: tab.document.collectionID,
          }
    "
    :prev-config="testRunnerConfig"
    @hide-modal="showCollectionsRunnerModal = false"
  />
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppCollection, HoppRESTHeader } from "@hoppscotch/data"
import { SmartTreeAdapter } from "@hoppscotch/ui"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { pipe } from "fp-ts/lib/function"
import * as TE from "fp-ts/TaskEither"
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"
import { useColorMode } from "~/composables/theming"
import { useToast } from "~/composables/toast"
import { GQLError } from "~/helpers/backend/GQLClient"
import {
  getCompleteCollectionTree,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import {
  HoppTestRunnerDocument,
  TestRunnerIterationResult,
} from "~/helpers/rest/document"
import {
  CollectionNode,
  TestRunnerCollectionsAdapter,
} from "~/helpers/runner/adapter"
import { getErrorMessage } from "~/helpers/runner/collection-tree"
import { transformInheritedCollectionVariablesToAggregateEnv } from "~/helpers/utils/inheritedCollectionVarTransformer"
import {
  getRESTCollectionByRefId,
  getRESTCollectionInheritedProps,
  restCollectionStore,
} from "~/newstore/collections"
import {
  getCurrentEnvironment,
  getSelectedEnvironmentType,
} from "~/newstore/environments"
import { HoppTab } from "~/services/tab"
import { RESTTabService } from "~/services/tab/rest"
import { TeamCollectionsService } from "~/services/team-collection.service"
import {
  TestRunnerRequest,
  TestRunnerService,
} from "~/services/test-runner/test-runner.service"
import IconPlus from "~icons/lucide/plus"
import IconDownload from "~icons/lucide/download"
import {
  exportRunnerResults,
  RunnerExportScope,
} from "~/helpers/import-export/export/runnerResults"
import * as E from "fp-ts/Either"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const teamCollectionService = useService(TeamCollectionsService)
const teamCollectionList = teamCollectionService.collections

const props = defineProps<{ modelValue: HoppTab<HoppTestRunnerDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppTestRunnerDocument>): void
}>()

const tabs = useService(RESTTabService)
const tab = useVModel(props, "modelValue", emit)

// The sticky run header spans two rows of variable-height content (long
// collection names, locale-dependent labels). Measure it at runtime so the
// filter tabs and iteration headers below it stick at the correct offset via
// the --upper-runner-sticky-fold CSS var, instead of a brittle hardcoded value.
const headerEl = ref<HTMLElement | null>(null)
const headerHeight = ref(0)
let headerResizeObserver: ResizeObserver | null = null

const selectedRequestPath = computed(
  () => tab.value.document.selectedRequestPath
)
const duration = computed(() => tab.value.document.testRunnerMeta.totalTime)
const avgResponseTime = computed(() =>
  calculateAverageTime(
    tab.value.document.testRunnerMeta.totalTime,
    tab.value.document.testRunnerMeta.completedRequests
  )
)

function msToHumanReadable(ms: number) {
  const seconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000

  let result = ""
  if (seconds > 0) {
    result += `${seconds}s `
  }
  result += `${milliseconds}ms`

  return result.trim()
}

const selectedRequest = computed(() => tab.value.document.request)

const onSelectRequest = async (request: TestRunnerRequest) => {
  tab.value.document.request = null
  await nextTick() // HACK: To ensure the request is cleared before setting the new request. there is a bug in the response component that doesn't change to the valid lens when the response is changed.
  tab.value.document.request = request
}

const onChangeRequestPath = (path: string) => {
  tab.value.document.selectedRequestPath = path
}

const collectionName = computed(() =>
  props.modelValue.document.type === "test-runner"
    ? props.modelValue.document.collection.name
    : ""
)

const runEnvironmentName = computed(
  () => tab.value.document.environmentName ?? "Global"
)

const testRunnerConfig = computed(() => tab.value.document.config)

const iterationResults = computed(
  () => tab.value.document.iterationResults ?? []
)

const collection = computed(() => {
  return tab.value.document.collection
})

// for re-run config
const showCollectionsRunnerModal = ref(false)
const selectedCollectionID = ref<string>()

const testRunnerStopRef = ref(false)
const showResult = computed(() => {
  return (
    tab.value.document.status === "running" ||
    tab.value.document.status === "stopped" ||
    tab.value.document.status === "error"
  )
})

const runTests = async () => {
  const { collectionID, collectionType } = tab.value.document

  tab.value.document.environmentName =
    getSelectedEnvironmentType() === "NO_ENV_SELECTED"
      ? "Global"
      : getCurrentEnvironment().name

  const isPersonalWorkspace = collectionType === "my-collections"

  const collections = isPersonalWorkspace
    ? restCollectionStore.value.state
    : teamCollectionList.value.map(teamCollToHoppRESTColl)

  const collectionInheritedProps = getRESTCollectionInheritedProps(
    collectionID,
    collections,
    collectionType
  )

  let resolvedCollection: HoppCollection = collection.value
  // Scripts declared on ancestors above the selected run-start node — must be
  // seeded into the runner so partial-scope runs still honor the documented
  // Root → Parent → Child → Request inheritance chain.
  let ancestorPreRequestScripts: string[] = []
  let ancestorTestScripts: string[] = []

  if (!isPersonalWorkspace) {
    const requestAuth = tab.value.document.inheritedProperties?.auth
      .inheritedAuth ?? {
      authActive: true,
      authType: "none",
    }

    const requestHeaders = tab.value.document.inheritedProperties?.headers.map(
      (header) => {
        if (header.inheritedHeader) {
          return header.inheritedHeader
        }
        return []
      }
    )

    const parentVariables = transformInheritedCollectionVariablesToAggregateEnv(
      tab.value.document.inheritedProperties?.variables ?? []
    )

    // Team cascade includes the selected node itself in its scripts array;
    // drop it here because runTestCollection will cascade that node's scripts
    // as part of the normal tree walk, and we must not double-run them.
    const inheritedScripts = (
      tab.value.document.inheritedProperties?.scripts ?? []
    ).filter((s) => s.parentID !== collectionID)
    ancestorPreRequestScripts = inheritedScripts
      .map((s) => s.preRequestScript)
      .filter((s) => s && s.trim().length > 0)
    ancestorTestScripts = inheritedScripts
      .map((s) => s.testScript)
      .filter((s) => s && s.trim().length > 0)

    resolvedCollection = {
      ...collection.value,
      auth: requestAuth,
      headers: requestHeaders as HoppRESTHeader[],
      variables: parentVariables,
    }
  } else {
    const {
      auth,
      headers,
      variables,
      ancestorPreRequestScripts: preAncestors,
      ancestorTestScripts: testAncestors,
    } = collectionInheritedProps ?? {
      auth: { authActive: true, authType: "none" },
      headers: [],
      variables: [],
      ancestorPreRequestScripts: [],
      ancestorTestScripts: [],
    }

    ancestorPreRequestScripts = preAncestors
    ancestorTestScripts = testAncestors

    resolvedCollection = {
      ...collection.value,
      auth,
      headers,
      variables,
    }
  }

  testRunnerStopRef.value = false // when testRunnerStopRef is false, the test runner will start running
  testRunnerService.runTests(
    tab,
    resolvedCollection,
    {
      ...testRunnerConfig.value,
      stopRef: testRunnerStopRef,
    },
    ancestorPreRequestScripts,
    ancestorTestScripts
  )
}

const stopTests = () => {
  testRunnerStopRef.value = true
  // when we manually stop the test runner, we need to update the tab document with the current state
  tab.value.document.testRunnerMeta = {
    ...tab.value.document.testRunnerMeta,
  }
}

const runAgain = async () => {
  tab.value.document.request = null
  tab.value.document.resultCollection = undefined
  await nextTick()
  resetRunnerState()
  const updatedCollection = await refetchCollectionTree()

  if (updatedCollection) {
    if (checkIfCollectionIsEmpty(updatedCollection)) {
      tabs.closeTab(tab.value.id)
      toast.error(t("collection_runner.empty_collection"))
      return
    }

    tab.value.document.collection = updatedCollection
    await nextTick()
    runTests()
  } else {
    tabs.closeTab(tab.value.id)
    toast.error(t("collection_runner.collection_not_found"))
  }
}

const resetRunnerState = () => {
  tab.value.document.testRunnerMeta = {
    failedTests: 0,
    passedTests: 0,
    totalTests: 0,
    totalRequests: 0,
    totalTime: 0,
    completedRequests: 0,
  }
}

onMounted(() => {
  if (tab.value.document.status === "idle") runTests()

  if (headerEl.value) {
    headerResizeObserver = new ResizeObserver(() => {
      if (headerEl.value) headerHeight.value = headerEl.value.offsetHeight
    })
    headerResizeObserver.observe(headerEl.value)
    headerHeight.value = headerEl.value.offsetHeight
  }
})

onBeforeUnmount(() => {
  headerResizeObserver?.disconnect()
})

function calculateAverageTime(
  totalTime: number,
  completedRequests: number
): number {
  return completedRequests > 0 ? Math.round(totalTime / completedRequests) : 0
}

const newRun = () => {
  showCollectionsRunnerModal.value = true
  selectedCollectionID.value = collection.value.id
}

const canExport = computed(
  () =>
    showResult.value &&
    tab.value.document.status !== "running" &&
    iterationResults.value.length > 0
)

const exportResults = async (scope: RunnerExportScope) => {
  const result = await exportRunnerResults(tab.value.document, scope)
  if (E.isRight(result)) toast.success(t(result.right))
  else toast.error(t(result.left))
}

const testRunnerService = useService(TestRunnerService)

const showTestsType = ref<"all" | "passed" | "failed">("all")

// 0 = no pending jump; set to an iteration number to scroll its section into
// view. Reset back to 0 after the result view consumes it so re-selecting the
// same iteration triggers another scroll.
const jumpToIteration = ref(0)

type IterationAdapterEntry = {
  iteration: number
  adapter: SmartTreeAdapter<CollectionNode>
}

// Adapters are cached per iteration so appending a new iteration doesn't rebuild
// the existing ones (previously O(N^2) across a run) and each iteration's
// SmartTree keeps its expansion state. An entry is rebuilt only when the backing
// iteration-result object is replaced (e.g. persisted-state restore).
const adapterCache = new Map<
  number,
  { source: TestRunnerIterationResult; entry: IterationAdapterEntry }
>()

const iterationAdapters = computed<IterationAdapterEntry[]>(() =>
  iterationResults.value.map((iterationResult) => {
    const cached = adapterCache.get(iterationResult.iteration)
    if (cached?.source === iterationResult) return cached.entry

    const entry: IterationAdapterEntry = {
      iteration: iterationResult.iteration,
      adapter: new TestRunnerCollectionsAdapter(
        computed(() =>
          iterationResult.resultCollection
            ? [iterationResult.resultCollection]
            : []
        ),
        showTestsType
      ),
    }
    adapterCache.set(iterationResult.iteration, {
      source: iterationResult,
      entry,
    })
    return entry
  })
)

/**
 * refetches the collection tree from the backend
 * @returns collection tree
 */
const refetchCollectionTree = async () => {
  if (!tab.value.document.collectionID) return
  const type = tab.value.document.collectionType
  if (type === "my-collections") {
    return getRESTCollectionByRefId(tab.value.document.collectionID)
  }

  return pipe(
    getCompleteCollectionTree(tab.value.document.collectionID),
    TE.match(
      (err: GQLError<string>) => {
        toast.error(`${getErrorMessage(err, t)}`)
        return
      },
      async (coll) => {
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
</script>
