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
        v-for="childNode in childNodes"
        :key="childNode.id"
        :node-item="childNode"
        :adapter="adapter"
      >
        <!-- The child slot is given a dynamic name in order to not break Volar -->
        <template #[CHILD_SLOT_NAME]="{ node, toggleChildren, isOpen }">
          <!-- Casting to help with type checking -->
          <slot
            :node="node as TreeNode<T>"
            :toggle-children="toggleChildren as () => void"
            :is-open="isOpen as boolean"
          ></slot>
        </template>
      </TreeBranch>
    </div>
    <div v-else class="flex flex-1 flex-col">
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

const CHILD_SLOT_NAME = "default"

const showChildren = ref(false)
const isNodeOpen = ref(false)

const childNodes = computed(
  () => props.adapter.getChildren(props.nodeItem.id).value
)

const hasChildren = computed(() => childNodes.value.length > 0)

const toggleNodeChildren = () => {
  showChildren.value = !showChildren.value
  isNodeOpen.value = !isNodeOpen.value
}
</script>
