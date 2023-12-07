<template>
  <div
    class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b border-t bg-primary border-dividerLight top-upperRunnerStickyFold"
  >
    <d class="flex items-center">
      <label class="font-semibold truncate text-secondaryLight">
        {{ t("test.requests") }}
      </label>
    </d>
    <div class="flex">
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('test.selection')"
        :label="t('test.selection')"
        :icon="showCheckbox ? IconMousePointer : IconMouseSquare"
        @click="showCheckbox = !showCheckbox"
      />
    </div>
  </div>

  <div class="flex flex-1 border-b border-dividerLight">
    <div class="w-2/3 border-r border-dividerLight h-full">
      <HoppSmartTree :adapter="collectionAdapter" :expandAll="true">
        <template #content="{ node }">
          <HttpTestFolder
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
            folder-type="collection"
          />

          <HttpTestRequest
            v-if="node.data.type === 'requests'"
            :request="node.data.data.data"
            :request-i-d="node.id"
            :parent-i-d="node.data.data.parentIndex"
            :is-selected="node.data.isSelected"
            :show-selection="showCheckbox"
          />
        </template>
      </HoppSmartTree>
    </div>
    <div
      class="flex-shrink-0 w-full h-full p-4 overflow-auto overflow-x-auto bg-primary min-w-46 max-w-1/3 z-9"
    >
      <section>
        <h4 class="font-semibold text-secondaryDark">Run Configuration</h4>
        <div class="mt-4">
          <!-- TODO: fix input component types -->
          <HoppSmartInput
            v-model="(config.iterations as any)"
            type="number"
            class="mb-4"
            :label="t('Iteration')"
            input-styles="floating-input"
          />
          <HoppSmartInput
            v-model="(config.delay as any)"
            type="number"
            :label="t('Delay')"
            class="!rounded-r-none !border-r-0"
            input-styles="floating-input !rounded-r-none !border-r-0"
          >
            <template #button>
              <span
                class="px-4 py-2 font-semibold border rounded-r bg-primaryLight border-divider text-secondaryLight"
              >
                ms
              </span>
            </template>
          </HoppSmartInput>
        </div>
      </section>

      <section class="mt-6">
        <span class="text-xs text-secondaryLight"> Advanced Settings </span>

        <div class="flex flex-col gap-4 mt-4 items-start">
          <HoppSmartCheckbox
            class="pr-2"
            :on="config.stopOnError"
            @change="config.stopOnError = !config.stopOnError"
          >
            <span>Stop run if an error occurs</span>
          </HoppSmartCheckbox>

          <HoppSmartCheckbox
            class="pr-2"
            :on="config.persistResponses"
            @change="config.persistResponses = !config.persistResponses"
          >
            <span>Persist responses</span>
            <HoppButtonSecondary
              class="!py-0 pl-2"
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/documentation/features/inspections"
              blank
              :title="t('app.wiki')"
              :icon="IconHelpCircle"
            />
          </HoppSmartCheckbox>

          <HoppSmartCheckbox
            class="pr-2"
            :on="config.keepVariableValues"
            @change="config.keepVariableValues = !config.keepVariableValues"
          >
            <span>Keep variable values</span>
            <HoppButtonSecondary
              class="!py-0 pl-2"
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/documentation/features/inspections"
              blank
              :title="t('app.wiki')"
              :icon="IconHelpCircle"
            />
          </HoppSmartCheckbox>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconHelpCircle from "~icons/lucide/help-circle"
import IconMouseSquare from "~icons/lucide/mouse-pointer-square-dashed"
import IconMousePointer from "~icons/lucide/mouse-pointer-square"
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
import { TestRunnerConfig } from "./Runner.vue"

const t = useI18n()
const props = defineProps<{
  modelValue: HoppTab<HoppTabDocument>
  config: TestRunnerConfig
}>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppTabDocument>): void
  (e: "update:config", val: TestRunnerConfig): void
}>()

const tab = useVModel(props, "modelValue", emit)
const config = useVModel(props, "config", emit)

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
              isSelected: true,
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
              isSelected: true,
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
