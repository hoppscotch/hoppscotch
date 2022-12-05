<template>
  <div class="flex flex-col">
    <div v-if="rootNodes.status === 'loaded' && rootNodes.data.length > 0">
      <div v-for="rootNode in rootNodes.data" :key="rootNode.id">
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
      class="flex flex-1 flex-col items-center justify-center p-4"
    >
      <SmartSpinner class="my-4" />
      <span class="text-secondaryLight">{{ t("state.loading") }}</span>
    </div>
    <div
      v-if="rootNodes.status === 'loaded' && rootNodes.data.length === 0"
      class="flex flex-col flex-1"
    >
      <slot name="emptyNode" :node="null"></slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends any">
import { computed, Ref } from "vue"
import { useI18n } from "~/composables/i18n"

/**
 * Representation of a tree node in the SmartTreeAdapter.
 */
export type TreeNode<T> = {
  id: string
  data: T
}

/**
 * Representation of children result from a tree node when there will be a loading state.
 */
export type ChildrenResult<T> =
  | {
      status: "loading"
    }
  | {
      status: "loaded"
      data: Array<TreeNode<T>>
    }

/**
 * A tree adapter that can be used with the SmartTree component.
 * @template T The type of data that is stored in the tree.
 */
export interface SmartTreeAdapter<T> {
  /**
   *
   * @param nodeID - id of the node to get children for
   * @returns - Ref that contains the children of the node. It is reactive and will be updated when the children are changed.
   */
  getChildren: (nodeID: string | null) => Ref<ChildrenResult<T>>
}

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
