<template>
  <slot :node="nodeItem" :toggle-children="toggleNodeChildren"></slot>
  <div v-if="showChildren" class="mx-5">
    <div v-if="isShowChildren" class="text-red">
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
    <div v-else class="bg-orange-200 px-5">
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

const isShowChildren = computed(
  () => props.adapter.getChildren(props.nodeItem.id).length > 0
)

const toggleNodeChildren = () => {
  showChildren.value = !showChildren.value
}
</script>
