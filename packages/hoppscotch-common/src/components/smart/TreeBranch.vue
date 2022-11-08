<template>
  <slot
    :node="nodeItem"
    :toggle-children="toggleNodeChildren"
    :is-open="isNodeOpen"
  ></slot>
  <div v-if="showChildren" class="flex flex-1">
    <div
      class="bg-dividerLight cursor-nsResize flex ml-5.5 transform transition w-1 hover:bg-dividerDark hover:scale-x-125"
      @click="toggleNodeChildren"
    ></div>
    <div v-if="hasChildren" class="flex flex-1 flex-col">
      <TreeBranch
        v-for="childNode in adapter.getChildren(nodeItem.id)"
        :key="childNode.id"
        :node-item="childNode"
        :adapter="adapter"
      >
        <template #[slotName]="{ node, toggleChildren, isOpen }">
          <slot
            :node="node"
            :toggle-children="toggleChildren"
            :is-open="isOpen"
          ></slot>
        </template>
      </TreeBranch>
    </div>
    <div v-else class="px-5 flex-1">
      <slot name="empty"></slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends any">
import { computed, ref } from "vue"
import { SmartTreeAdapter, TreeNode } from "~/helpers/tree/SmartTreeAdapter"

const props = defineProps<{
  adapter: SmartTreeAdapter<T>
  nodeItem: TreeNode<T>
}>()

const slotName = "default"

const showChildren = ref(false)
const isNodeOpen = ref(false)

const hasChildren = computed(
  () => props.adapter.getChildren(props.nodeItem.id).length > 0
)

const toggleNodeChildren = () => {
  showChildren.value = !showChildren.value
  isNodeOpen.value = !isNodeOpen.value
}
</script>
