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
import { SmartTreeAdapter } from "@hoppscotch/ui/dist/helpers/treeAdapter"
import { useVModel } from "@vueuse/core"
import { ref, toRef } from "vue"
import { useI18n } from "~/composables/i18n"
import { HoppTabDocument } from "~/helpers/rest/document"
import { TestRunnerCollectionsAdapter } from "~/helpers/runner/adapter"
import { HoppTab } from "~/services/tab"

const t = useI18n()
const props = defineProps<{ modelValue: HoppTab<HoppTabDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppTabDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

const selectedTestTab = ref("all_tests")

const showCheckbox = ref(false)

const collection = toRef(
  tab.value.document.type === "test-runner"
    ? [tab.value.document.collection]
    : []
)

const collectionAdapter: SmartTreeAdapter<any> =
  new TestRunnerCollectionsAdapter(collection)
</script>
