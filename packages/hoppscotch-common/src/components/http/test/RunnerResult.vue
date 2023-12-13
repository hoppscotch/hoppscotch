<template>
  <HoppSmartTabs
    v-model="selectedTestTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperRunnerStickyFold z-10"
    render-inactive-tabs
  >
    <HoppSmartTab
      :id="'all_tests'"
      :label="`${t('tab.all_tests')}`"
      :info="`${8}`"
    >
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
    <HoppSmartTab :id="'passed'" :label="`${t('tab.passed')}`" :info="`${3}`">
      tab passed
    </HoppSmartTab>
    <HoppSmartTab :id="'failed'" :label="`${t('tab.failed')}`" :info="`${5}`">
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { SmartTreeAdapter } from "@hoppscotch/ui/dist/helpers/treeAdapter"
import { ref, onMounted, computed, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { TestRunnerCollectionsAdapter } from "~/helpers/runner/adapter"
import { TestRunnerService } from "~/services/test-runner/test-runner.service"
import { useService } from "dioc/vue"
import { TestRunnerConfig } from "./Runner.vue"

const t = useI18n()
const testRunnerService = useService(TestRunnerService)

const props = defineProps<{
  collection: HoppCollection<HoppRESTRequest>
  config: TestRunnerConfig
}>()

const selectedTestTab = ref("all_tests")

const showCheckbox = ref(false)

const runnerState = testRunnerService.runTests(props.collection, props.config)

watch(
  () => runnerState.value,
  () => {
    console.log(runnerState.value)
  },
  {
    deep: true,
  }
)

const result = computed(() => {
  return [runnerState.value.result]
})

// const runTest = async () => {
//   const state = testRunnerService.runTests(props.collection, props.config)
//   watch(
//     () => state,
//     () => {
//       runnerState.value = state.value
//     },
//     {
//       deep: true,
//     }
//   )
// }

// onMounted(() => {
//   runTest()
// })

const collectionAdapter: SmartTreeAdapter<any> =
  new TestRunnerCollectionsAdapter(result)
</script>
