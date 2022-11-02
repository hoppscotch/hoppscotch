<template>
  <slot
    :node="nodeItem"
    :toggle-children="toggleNodeChildren"
    :is-open="isOpen"
  ></slot>
  <div v-if="showChildren" class="ml-2">
    <div v-if="isShowChildren" class="text-red">
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
    <div v-else class="px-5">
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
const isOpen = ref(false)

const isShowChildren = computed(
  () => props.adapter.getChildren(props.nodeItem.id).length > 0
)

const toggleNodeChildren = () => {
  showChildren.value = !showChildren.value
  isOpen.value = !isOpen.value
}
</script>
