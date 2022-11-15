<template>
  <div class="flex flex-col flex-1">
    <div v-if="rootNodes && rootNodes.length > 0">
      <div v-for="rootNode in rootNodes" :key="rootNode.id">
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
          <template #empty>
            <slot name="emptyRoot"></slot>
          </template>
        </SmartTreeBranch>
      </div>
    </div>
    <div v-else class="flex flex-1 flex-col">
      <slot name="emptyRoot"></slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends any">
import { computed } from "vue"
import { SmartTreeAdapter, TreeNode } from "~/helpers/tree/SmartTreeAdapter"

const props = defineProps<{
  /**
   * The adapter to use for the tree.
   */
  adapter: SmartTreeAdapter<T>
}>()

const rootNodes = computed(() => props.adapter.getChildren(null).value)
</script>
