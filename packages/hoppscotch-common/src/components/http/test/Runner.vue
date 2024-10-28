<template>
  <AppPaneLayout layout-id="rest-primary">
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
            <!-- <HttpTestRunnerMeta
              :heading="t('environment.heading')"
              :text="'None'"
            /> -->
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
          v-if="showResult && !stopRunningTest"
          :label="t('test.stop')"
          class="w-32"
          @click="stopRunningTest = false"
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
          :config="testRunnerConfig"
          :collection="collection"
          :stop-running="stopRunningTest"
          @on-stop-running="onStopRunning"
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
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"
import { computed, onMounted, ref } from "vue"
import {
  HoppTestRunnerDocument,
  TestRunnerConfig,
} from "~/helpers/rest/document"
import { HoppTab } from "~/services/tab"
import { TestRunState } from "~/services/test-runner/test-runner.service"
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
const stopRunningTest = ref(false)

onMounted(() => {
  if (tab.value.document.type === "test-runner") {
    showResult.value = true
  }
})

const onStopRunning = (testRunnerState: TestRunState) => {
  stopRunningTest.value = true

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

function calculateProgress(
  completedRequests: number,
  totalRequests: number
): number {
  return totalRequests > 0
    ? Math.round((completedRequests / totalRequests) * 100)
    : 0
}

const newRun = () => {
  showResult.value = false
  stopRunningTest.value = false
}
</script>
