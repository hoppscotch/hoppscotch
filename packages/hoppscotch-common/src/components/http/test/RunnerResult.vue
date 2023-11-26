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
import { ref } from "vue"
import { useVModel } from "@vueuse/core"
import { HoppTab } from "~/services/tab"
import { HoppTabDocument } from "~/helpers/rest/document"
import { useI18n } from "~/composables/i18n"
import {
  ChildrenResult,
  SmartTreeAdapter,
} from "@hoppscotch/ui/dist/helpers/treeAdapter"
import { toRef } from "vue"
import { Ref } from "vue"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { computed } from "vue"

const t = useI18n()
const props = defineProps<{ modelValue: HoppTab<HoppTabDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppTabDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

const selectedTestTab = ref("all_tests")

const showCheckbox = ref(false)

class MyCollectionsAdapter implements SmartTreeAdapter<any> {
  constructor(public data: Ref<HoppCollection<HoppRESTRequest>[]>) {}

  navigateToFolderWithIndexPath(
    collections: HoppCollection<HoppRESTRequest>[],
    indexPaths: number[]
  ) {
    if (indexPaths.length === 0) return null

    let target = collections[indexPaths.shift() as number]

    while (indexPaths.length > 0)
      target = target.folders[indexPaths.shift() as number]

    return target !== undefined ? target : null
  }

  getChildren(id: string | null): Ref<ChildrenResult<any>> {
    return computed(() => {
      if (id === null) {
        const data = this.data.value.map((item, index) => ({
          id: index.toString(),
          data: {
            type: "collections",
            isLastItem: index === this.data.value.length - 1,
            data: {
              parentIndex: null,
              data: item,
            },
          },
        }))
        console.log(data)
        return {
          status: "loaded",
          data: data,
        } as ChildrenResult<any>
      }

      const indexPath = id.split("/").map((x) => parseInt(x))

      const item = this.navigateToFolderWithIndexPath(
        this.data.value,
        indexPath
      )

      if (item) {
        const data = [
          ...item.folders.map((folder, index) => ({
            id: `${id}/${index}`,
            data: {
              isLastItem:
                item.folders && item.folders.length > 1
                  ? index === item.folders.length - 1
                  : false,
              type: "folders",
              isSelected: false,
              data: {
                parentIndex: id,
                data: folder,
              },
            },
          })),
          ...item.requests.map((requests, index) => ({
            id: `${id}/${index}`,
            data: {
              isLastItem:
                item.requests && item.requests.length > 1
                  ? index === item.requests.length - 1
                  : false,
              type: "requests",
              isSelected: false,
              data: {
                parentIndex: id,
                data: requests,
              },
            },
          })),
        ]

        return {
          status: "loaded",
          data: data,
        } as ChildrenResult<any>
      } else {
        return {
          status: "loaded",
          data: [],
        }
      }
    })
  }
}

const collection = toRef(
  tab.value.document.type === "test-runner"
    ? [tab.value.document.collection]
    : []
)

const collectionAdapter: SmartTreeAdapter<any> = new MyCollectionsAdapter(
  collection
)
</script>
