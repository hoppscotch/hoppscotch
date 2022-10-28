<template>
  <slot :node="nodeItem" :toggle-children="toggleNodeChildren"></slot>
  <div v-if="showChildren" class="mx-5">
    <TreeBranch
      v-for="childNode in adapter.getChildren(nodeItem.id)"
      :key="childNode.id"
      :node-item="childNode"
      :adapter="adapter"
    >
      <template #[slotName]="{ node, toggleChildren }">
        <slot :node="node" :toggle-children="toggleChildren"></slot>
      </template>
    </TreeBranch>
  </div>
</template>

<script setup lang="ts" generic="T extends any">
import { ref } from "vue"
import { SmartTreeAdapter, TreeNode } from "~/helpers/tree/SmartTreeAdapter"

defineProps<{
  adapter: SmartTreeAdapter<T>
  nodeItem: TreeNode<T>
}>()

const slotName = "default"

const showChildren = ref(false)

const toggleNodeChildren = () => {
  showChildren.value = !showChildren.value
}
</script>
