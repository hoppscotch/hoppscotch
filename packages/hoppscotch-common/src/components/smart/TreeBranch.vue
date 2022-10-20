<template>
  <slot :node="node" :toggle-children="toggleChildren"></slot>
  <div v-if="showChildren" class="mx-5">
    <TreeBranch
      v-for="childNode in adapter.getChildren(node.id)"
      :key="childNode.id"
      :node="childNode"
      :adapter="adapter"
    >
      <template #default="{ node, toggleChildren }">
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
  node: TreeNode<T>
}>()

const showChildren = ref(false)

const toggleChildren = () => {
  showChildren.value = !showChildren.value
}
</script>
