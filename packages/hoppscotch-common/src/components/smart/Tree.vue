<template>
  <div class="flex flex-col flex-1">
    <div
      v-if="rootNodes.status === 'loaded' && rootNodes.data.length > 0"
      class="flex flex-col"
    >
      <div
        v-for="rootNode in rootNodes.data"
        :key="rootNode.id"
        class="flex flex-col flex-1"
      >
        <SmartTreeBranch
          :node-item="rootNode"
          :adapter="adapter as SmartTreeAdapter<T>"
        >
          <template #default="{ node, toggleChildren, isOpen }">
            <slot
              name="content"
              :node="node as TreeNode<T>"
              :toggle-children="toggleChildren as () => void"
              :is-open="isOpen as boolean"
            ></slot>
          </template>
          <template #emptyNode="{ node }">
            <slot name="emptyNode" :node="node"></slot>
          </template>
        </SmartTreeBranch>
      </div>
    </div>
    <div
      v-else-if="rootNodes.status === 'loading'"
      class="flex flex-col items-center justify-center flex-1 p-4"
    >
      <HoppSmartSpinner class="my-4" />
      <span class="text-secondaryLight">{{ t("state.loading") }}</span>
    </div>
    <div
      v-if="rootNodes.status === 'loaded' && rootNodes.data.length === 0"
      class="flex flex-col flex-1"
    >
      <slot name="emptyNode" :node="(null as TreeNode<T> | null)"></slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends any">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { SmartTreeAdapter, TreeNode } from "~/helpers/treeAdapter"

const props = defineProps<{
  /**
   * The adapter that will be used to fetch the tree data
   * @template T The type of the data that will be stored in the tree
   */
  adapter: SmartTreeAdapter<T>
}>()

const t = useI18n()

/**
 * Fetch the root nodes from the adapter by passing the node id as null
 */
const rootNodes = computed(() => props.adapter.getChildren(null).value)
</script>
