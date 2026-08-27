<template>
  <!-- Run results aren't persisted; a restored tab has nothing to show. -->
  <template v-if="hasResults || isRunning">
    <div ref="filterTabsEl" class="sticky top-upperRunnerStickyFold z-10">
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
      :style="{ '--runner-filter-tabs-height': `${filterTabsHeight}px` }"
    >
      <div
        v-for="{ iteration, key, adapter } in iterationAdapters"
        :key="key"
        :ref="(el) => setIterationRef(iteration, el)"
        class="iteration-group"
      >
        <!-- Pins below the measured filter-tabs row. Sticky never lets the
           element rise above its `top` line, so an offset larger than the
           real tabs height parks the header over the first row's top edge. -->
        <div
          class="sticky top-[calc(var(--upper-runner-sticky-fold,0px)_+_var(--runner-filter-tabs-height,3rem))] z-[9] px-4 py-2 bg-primaryLight border-b border-divider font-semibold text-secondaryDark"
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

  <HoppSmartPlaceholder
    v-else
    :src="`/images/states/${colorMode.value}/pack.svg`"
    :text="`${t('collection_runner.results_not_restored')}`"
  />
</template>

<script setup lang="ts">
import { SmartTreeAdapter } from "@hoppscotch/ui"
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
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
    /** Changes whenever the adapter is rebuilt, so the tree remounts with it. */
    key: string
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
  (e: "visibleIteration", iteration: number): void
}>()

const selectedTestTab = ref<"all" | "passed" | "failed">("all")

const hasResults = computed(() => props.iterationAdapters.length > 0)

// The iteration headers pin below the filter-tabs row, so its real height
// feeds their sticky offset via --runner-filter-tabs-height. Measured like
// the run-details fold in Runner.vue rather than hardcoded.
const filterTabsEl = ref<HTMLElement | null>(null)
const filterTabsHeight = ref(48)
let filterTabsResizeObserver: ResizeObserver | null = null

watch(filterTabsEl, (el) => {
  filterTabsResizeObserver?.disconnect()
  if (!el) return

  filterTabsResizeObserver ??= new ResizeObserver((entries) => {
    const height = entries.at(-1)?.contentRect.height
    if (height) filterTabsHeight.value = Math.round(height)
  })
  filterTabsResizeObserver.observe(el)
})

onBeforeUnmount(() => filterTabsResizeObserver?.disconnect())

const iterationRefs = new Map<number, HTMLElement>()

const setIterationRef = (iteration: number, el: unknown) => {
  if (el instanceof HTMLElement) iterationRefs.set(iteration, el)
  else iterationRefs.delete(iteration)
}

// Report the iteration under the reading line (just below the pinned filter
// tabs) so the jump control tracks manual scrolling. The scroll container
// belongs to the pane layout, so listen in the capture phase on the document
// instead of reaching for an ancestor by class.
let visibleIterationScheduled = false

const scrollContainerOf = (el: HTMLElement): HTMLElement | null => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === "auto" || overflowY === "scroll") return node
  }
  return null
}

const reportVisibleIteration = () => {
  visibleIterationScheduled = false
  const tabsEl = filterTabsEl.value
  if (!tabsEl || iterationRefs.size === 0) return

  // At the bottom of an overflowing pane the reading line can't reach the
  // tail iterations; report the last one so a jump there isn't overwritten.
  // Without the overflow check a short, non-scrolling run is always "at the
  // bottom" and would report the last iteration while the user sees the first.
  const container = scrollContainerOf(tabsEl)
  if (
    container &&
    container.scrollHeight > container.clientHeight &&
    container.scrollTop + container.clientHeight >= container.scrollHeight - 2
  ) {
    emit("visibleIteration", Math.max(...iterationRefs.keys()))
    return
  }

  const line = tabsEl.getBoundingClientRect().bottom + 4
  for (const [iteration, el] of iterationRefs) {
    const rect = el.getBoundingClientRect()
    if (rect.top <= line && rect.bottom > line) {
      emit("visibleIteration", iteration)
      return
    }
  }
}

const onScrollCapture = (event: Event) => {
  // Capture-phase on document sees every scroll in the app; only react when
  // the scrolled container is an ancestor of this result view.
  const tabsEl = filterTabsEl.value
  if (!tabsEl) return
  const target = event.target
  if (target instanceof Element && !target.contains(tabsEl)) return

  if (visibleIterationScheduled) return
  visibleIterationScheduled = true
  requestAnimationFrame(reportVisibleIteration)
}

onMounted(() => {
  document.addEventListener("scroll", onScrollCapture, {
    capture: true,
    passive: true,
  })
  // A remount (tab switch and back) restores the list scrolled to the top
  // while the document may remember another iteration — re-align once.
  nextTick().then(reportVisibleIteration)
})
onBeforeUnmount(() =>
  document.removeEventListener("scroll", onScrollCapture, { capture: true })
)

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
  scroll-margin-top: calc(
    var(--upper-runner-sticky-fold, 0px) +
      var(--runner-filter-tabs-height, 3rem)
  );
}
</style>
