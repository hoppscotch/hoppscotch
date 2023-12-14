<template>
  <HoppSmartTabs
    v-model="selectedTestTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperRunnerStickyFold z-10"
    render-inactive-tabs
  >
    <HoppSmartTab :id="'all_tests'" :label="`${t('tab.all_tests')}`">
      <div class="flex flex-col justify-center p-4">
        <HoppSmartTree :adapter="collectionAdapter" :expandAll="true">
          <template #content="{ node }">
            <HttpTestResultFolder
              v-if="
                node.data.type === 'folders' &&
                node.data.data.data.requests.length > 0
              "
              :id="node.id"
              :parent-i-d="node.data.data.parentIndex"
              :data="node.data.data.data"
              :is-open="true"
              :is-selected="node.data.isSelected"
              :is-last-item="node.data.isLastItem"
              :show-selection="showCheckbox"
              folder-type="folder"
            />

            <HttpTestResultRequest
              v-if="node.data.type === 'requests'"
              :request="node.data.data.data"
              :request-i-d="node.id"
              :parent-i-d="node.data.data.parentIndex"
              :is-selected="node.data.isSelected"
              :show-selection="showCheckbox"
              :is-last-item="node.data.isLastItem"
            />
          </template>
        </HoppSmartTree>
      </div>
    </HoppSmartTab>
    <HoppSmartTab :id="'passed'" :label="`${t('tab.passed')}`">
      tab passed
    </HoppSmartTab>
    <HoppSmartTab :id="'failed'" :label="`${t('tab.failed')}`">
      tab failed
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { SmartTreeAdapter } from "@hoppscotch/ui/dist/helpers/treeAdapter"
import { ref, computed, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { TestRunnerCollectionsAdapter } from "~/helpers/runner/adapter"
import {
  TestRunnerRequest,
  TestRunnerService,
} from "~/services/test-runner/test-runner.service"
import { useService } from "dioc/vue"
import { TestRunnerConfig } from "./Runner.vue"

const t = useI18n()
const testRunnerService = useService(TestRunnerService)

const props = defineProps<{
  collection: HoppCollection<HoppRESTRequest>
  config: TestRunnerConfig
  stopRunning: boolean
}>()

const emit = defineEmits<{
  (e: "onStopRunning"): void
}>()

const selectedTestTab = ref("all_tests")

const showCheckbox = ref(false)

const stopRunningTest = computed(() => {
  console.log("stopRunningTest", props.stopRunning)
  return props.stopRunning
})

const runnerState = testRunnerService.runTests(props.collection, {
  ...props.config,
  stopRef: stopRunningTest,
})

const result = ref<HoppCollection<TestRunnerRequest>[]>([])

watch(
  () => runnerState.value,
  () => {
    result.value = [runnerState.value.result]
    console.log("runnerState", runnerState.value.result)
    if (runnerState.value.status === "stopped") {
      console.log("stopped")
      emit("onStopRunning")
    }
  },
  {
    deep: true,
  }
)

const collectionAdapter: SmartTreeAdapter<any> =
  new TestRunnerCollectionsAdapter(result)
</script>
