<template>
  <div class="sticky top-upperRunnerStickyFold z-10">
    <HoppSmartTabs
      v-model="selectedTestTab"
      styles="overflow-x-auto flex-shrink-0 bg-primary"
      render-inactive-tabs
      @update:model-value="emit('onChangeTab', $event)"
    >
      <HoppSmartTab
        :id="'all'"
        :label="`${t('tab.all_tests')}`"
        :info="tab.document.testRunnerMeta.totalTests.toString()"
      >
      </HoppSmartTab>
      <HoppSmartTab
        :id="'passed'"
        :label="`${t('tab.passed')}`"
        :info="tab.document.testRunnerMeta.passedTests.toString()"
      >
      </HoppSmartTab>
      <HoppSmartTab
        :id="'failed'"
        :label="`${t('tab.failed')}`"
        :info="tab.document.testRunnerMeta.failedTests.toString()"
      >
      </HoppSmartTab>
    </HoppSmartTabs>
  </div>

  <div
    class="flex flex-col justify-center test-runner pr-2"
    :class="{
      hidden:
        (selectedTestTab === 'passed' &&
          tab.document.testRunnerMeta.passedTests === 0) ||
        (selectedTestTab === 'failed' &&
          tab.document.testRunnerMeta.failedTests === 0),
    }"
  >
    <div
      v-for="{ iteration, adapter } in iterationAdapters"
      :key="iteration"
      :ref="(el) => setIterationRef(iteration, el)"
      class="iteration-group"
    >
      <div
        class="sticky top-upperRunnerStickyFold z-[9] px-4 py-2 bg-primaryLight border-b border-divider font-semibold text-secondaryDark"
      >
        {{ t("collection_runner.iteration", { count: iteration }) }}
      </div>
      <HoppSmartTree :expand-all="true" :adapter="adapter">
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
            :is-last-item="node.data.isLastItem"
            folder-type="folder"
          />

          <HttpTestResultRequest
            v-if="node.data.type === 'requests' && !node.data.hidden"
            class="runner-request"
            :show-test-type="selectedTestTab"
            :request="node.data.data.data"
            :request-i-d="node.id"
            :parent-i-d="node.data.data.parentIndex"
            :is-selected="`${iteration}::${node.id}` === selectedRequestPath"
            :is-last-item="node.data.isLastItem"
            @select-request="
              selectRequest(node.data.data.data, `${iteration}::${node.id}`)
            "
          />
        </template>
      </HoppSmartTree>
    </div>
  </div>

  <HoppSmartPlaceholder
    v-if="
      (selectedTestTab === 'passed' &&
        tab.document.testRunnerMeta.passedTests === 0) ||
      (selectedTestTab === 'failed' &&
        tab.document.testRunnerMeta.failedTests === 0)
    "
    :src="`/images/states/${colorMode.value}/pack.svg`"
    :text="
      selectedTestTab === 'passed'
        ? `${t('collection_runner.no_passed_tests')}`
        : `${t('collection_runner.no_failed_tests')}`
    "
  />
</template>

<script setup lang="ts">
import { SmartTreeAdapter } from "@hoppscotch/ui"
import { nextTick, ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useColorMode } from "~/composables/theming"
import { HoppTestRunnerDocument } from "~/helpers/rest/document"
import { HoppTab } from "~/services/tab"
import { TestRunnerRequest } from "~/services/test-runner/test-runner.service"

const t = useI18n()
const colorMode = useColorMode()

const props = defineProps<{
  tab: HoppTab<HoppTestRunnerDocument>
  iterationAdapters: {
    iteration: number
    adapter: SmartTreeAdapter<any>
  }[]
  isRunning: boolean
  selectedRequestPath: string
  jumpToIteration: number
}>()

const emit = defineEmits<{
  (e: "onSelectRequest", request: TestRunnerRequest): void
  (e: "onChangeTab", event: string): void
  (e: "requestPath", path: string): void
  (e: "jumped"): void
}>()

const selectedTestTab = ref<"all" | "passed" | "failed">("all")

const iterationRefs = new Map<number, HTMLElement>()

const setIterationRef = (iteration: number, el: unknown) => {
  if (el instanceof HTMLElement) iterationRefs.set(iteration, el)
  else iterationRefs.delete(iteration)
}

// The iteration group's scroll-margin-top (see <style>) offsets the scroll so
// the header lands below the sticky run-details fold and filter tabs.
watch(
  () => props.jumpToIteration,
  async (iteration) => {
    if (!iteration) return
    await nextTick()
    iterationRefs
      .get(iteration)
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
    emit("jumped")
  }
)

const selectRequest = (request: TestRunnerRequest, indexPath: string) => {
  emit("onSelectRequest", request)
  emit("requestPath", indexPath)
}
</script>

<style>
.test-runner > div > div > div > div > div > div {
  margin-left: 0;
  width: 0;
}

.test-runner .runner-request {
  @apply ml-2;
}

/* Offset jump-to-iteration scrolling past the sticky run-details fold and the
   filter-tabs row so the iteration header isn't hidden behind them. */
.iteration-group {
  scroll-margin-top: calc(var(--upper-runner-sticky-fold) + 3rem);
}
</style>
