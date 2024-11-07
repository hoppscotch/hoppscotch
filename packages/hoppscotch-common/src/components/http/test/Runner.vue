<template>
  <AppPaneLayout layout-id="test-runner-primary">
    <template #primary>
      <div
        class="flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary sticky top-0 z-20"
      >
        <div class="inline-flex flex-1 gap-8">
          <HttpTestRunnerMeta
            :heading="t('collection.title')"
            :text="collectionName"
          />

          <template v-if="showResult">
            <HttpTestRunnerMeta :heading="t('environment.heading')">
              <HttpTestEnv />
            </HttpTestRunnerMeta>
            <!-- <HttpTestRunnerMeta :heading="t('test.iterations')" :text="'1'" /> -->
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
          </template>
        </div>
        <HoppButtonPrimary
          v-if="showResult && tab.document.status === 'running'"
          :label="t('test.stop')"
          class="w-32"
          @click="stopTests()"
        />
        <HoppButtonPrimary
          v-else
          :label="t('test.run_again')"
          class="w-32"
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
      </div>

      <div v-if="showResult">
        <HttpTestRunnerResult
          :tab="tab"
          :collection-adapter="collectionAdapter"
          :is-running="tab.document.status === 'running'"
          @on-select-request="onSelectRequest"
        />
      </div>

      <!-- <div v-else class="flex flex-col flex-1">
        <HttpTestRunnerConfig v-model="tab" v-model:config="testRunnerConfig" />
      </div> -->
    </template>
    <template #secondary>
      <HttpTestResponse
        v-if="selectedRequest"
        :show-response="tab.document.config.persistResponses"
        v-model:document="selectedRequest"
      />

      <div
        v-else-if="tab.document.status === 'running'"
        class="flex flex-col items-center gap-4 justify-center h-full"
      >
        <HoppSmartSpinner />
        <span> {{ t("collection_runner.running_collection") }}... </span>
      </div>

      <HoppSmartPlaceholder
        v-else-if="!selectedRequest"
        :src="`/images/states/${colorMode.value}/add_files.svg`"
        :alt="`${t('collection_runner.select_request')}`"
        :text="`${t('collection_runner.select_request')}`"
      >
      </HoppSmartPlaceholder>

      <HoppSmartPlaceholder
        v-else-if="!testRunnerConfig.persistResponses"
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
    </template>
  </AppPaneLayout>

  <HttpTestRunnerModal
    v-if="showCollectionsRunnerModal"
    :same-tab="true"
    :collection-runner-data="
      tab.document.collectionType === 'my-collections'
        ? {
            type: 'my-collections',
            collection: tab.document.collection,
            collectionIndex: '0',
          }
        : {
            type: 'team-collections',
            collectionID: tab.document.collectionID!,
          }
    "
    @hide-modal="showCollectionsRunnerModal = false"
  />
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { SmartTreeAdapter } from "@hoppscotch/ui"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { computed, nextTick, onMounted, ref } from "vue"
import { useColorMode } from "~/composables/theming"
import { HoppTestRunnerDocument } from "~/helpers/rest/document"
import {
  CollectionNode,
  TestRunnerCollectionsAdapter,
} from "~/helpers/runner/adapter"
import { HoppTab } from "~/services/tab"
import {
  TestRunnerRequest,
  TestRunnerService,
} from "~/services/test-runner/test-runner.service"
import IconPlus from "~icons/lucide/plus"

const t = useI18n()
const colorMode = useColorMode()

const props = defineProps<{ modelValue: HoppTab<HoppTestRunnerDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppTestRunnerDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

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

const collectionName = computed(() =>
  props.modelValue.document.type === "test-runner"
    ? props.modelValue.document.collection.name
    : ""
)

const testRunnerConfig = computed(() => tab.value.document.config)

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
  testRunnerStopRef.value = false // when testRunnerStopRef is false, the test runner will start running
  testRunnerService.runTests(tab, collection.value, {
    ...testRunnerConfig.value,
    stopRef: testRunnerStopRef,
  })
}

const stopTests = () => {
  testRunnerStopRef.value = true
  // when we manually stop the test runner, we need to update the tab document with the current state
  tab.value.document.testRunnerMeta = {
    ...tab.value.document.testRunnerMeta,
  }
}

const runAgain = async () => {
  tab.value.document.resultCollection = undefined
  await nextTick()
  resetRunnerState()
  await nextTick()
  runTests()
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
  if (
    tab.value.document.status === "stopped" ||
    tab.value.document.status === "error"
  ) {
  }
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

const testRunnerService = useService(TestRunnerService)

const result = computed(() => {
  return tab.value.document.resultCollection
    ? [tab.value.document.resultCollection]
    : []
})

const collectionAdapter: SmartTreeAdapter<CollectionNode> =
  new TestRunnerCollectionsAdapter(result)
</script>
