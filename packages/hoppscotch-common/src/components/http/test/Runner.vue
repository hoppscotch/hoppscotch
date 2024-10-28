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
              :text="avgResponse ? msToHumanReadable(avgResponse) : '...'"
            />
          </template>
        </div>
        <HoppButtonPrimary
          v-if="showResult && !isTestStopped"
          :label="t('test.stop')"
          class="w-32"
          @click="isTestStopped = false"
        />
        <HoppButtonPrimary
          v-else
          :label="t('test.run_again')"
          class="w-32"
          @click="runTests()"
        />
        <HoppButtonSecondary
          :icon="IconPlus"
          :label="t('test.new_run')"
          filled
          outline
          @click="newRun()"
        />
      </div>

      <div v-if="showResult">
        <HttpTestRunnerResult
          :collection-adapter="collectionAdapter"
          :is-running="runnerState.status === 'running'"
          @on-select-request="selectedRequest = $event"
        />
      </div>

      <!-- <div v-else class="flex flex-col flex-1">
        <HttpTestRunnerConfig v-model="tab" v-model:config="testRunnerConfig" />
      </div> -->
    </template>
    <template #secondary>
      <HttpTestResponse
        v-if="selectedRequest"
        v-model:document="selectedRequest"
      />

      <div
        v-else-if="runnerState.status === 'running'"
        class="flex flex-col items-center gap-4 justify-center h-full"
      >
        <HoppSmartSpinner />
        <span> {{ t("collection_runner.running_collection") }}... </span>
      </div>

      <div
        v-else
        class="flex flex-col items-center gap-4 justify-center h-full"
      >
        <span> Select request to show response </span>
      </div>
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppCollection } from "@hoppscotch/data"
import { SmartTreeAdapter } from "@hoppscotch/ui"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { computed, onMounted, ref, watch } from "vue"
import {
  HoppTestRunnerDocument,
  TestRunnerConfig,
} from "~/helpers/rest/document"
import { TestRunnerCollectionsAdapter } from "~/helpers/runner/adapter"
import { HoppTab } from "~/services/tab"
import {
  TestRunnerService,
  TestRunState,
} from "~/services/test-runner/test-runner.service"
import IconPlus from "~icons/lucide/plus"

const t = useI18n()

const testRunnerConfig = ref<TestRunnerConfig>({
  iterations: 1,
  delay: 1000,
  stopOnError: false,
  persistResponses: false,
  keepVariableValues: false,
})

const props = defineProps<{ modelValue: HoppTab<HoppTestRunnerDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppTestRunnerDocument>): void
}>()

const duration = ref(0)
const avgResponse = ref(0)

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

const selectedRequest = ref<any>(null)

const collectionName = computed(() => {
  if (props.modelValue.document.type === "test-runner") {
    return props.modelValue.document.collection.name
  }
  return ""
})

const tab = useVModel(props, "modelValue", emit)

const collection = computed(() => {
  return tab.value.document.collection
})

const runTests = () => {
  showResult.value = true
}

const showResult = ref(false)
const isTestStopped = ref(false)

onMounted(() => {
  if (tab.value.document.type === "test-runner") {
    showResult.value = true
  }
})

const onStopRunning = (testRunnerState: TestRunState) => {
  isTestStopped.value = true

  duration.value = testRunnerState.totalTime
  avgResponse.value = calculateAverageTime(
    testRunnerState.totalTime,
    testRunnerState.completedRequests
  )

  console.log("stopRunning", duration.value, avgResponse.value)

  console.log("stopRunning", testRunnerState)
}

function calculateAverageTime(
  totalTime: number,
  completedRequests: number
): number {
  return completedRequests > 0 ? Math.round(totalTime / completedRequests) : 0
}

const newRun = () => {
  showResult.value = false
  isTestStopped.value = false
}

const testRunnerService = useService(TestRunnerService)

const result = ref<HoppCollection[]>([])

const runnerState = testRunnerService.runTests(tab, collection.value, {
  ...testRunnerConfig.value,
  stopRef: isTestStopped,
})

watch(
  () => runnerState.value,
  () => {
    result.value = [runnerState.value.result]
    if (runnerState.value.status === "stopped") {
      onStopRunning(runnerState.value)
    }
  },
  {
    deep: true,
  }
)

const collectionAdapter: SmartTreeAdapter<any> =
  new TestRunnerCollectionsAdapter(result)
</script>
