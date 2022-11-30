<template>
  <slot
    :node="nodeItem"
    :toggle-children="toggleNodeChildren"
    :is-open="isNodeOpen"
  ></slot>

  <div v-if="showChildren" class="flex">
    <div
      class="bg-dividerLight cursor-nsResize flex ml-5.5 transform transition w-1 hover:bg-dividerDark hover:scale-x-125"
      @click="toggleNodeChildren"
    ></div>
    <div
      v-if="childNodes.status === 'loaded' && childNodes.data.length > 0"
      class="flex flex-col flex-1 truncate"
    >
      <TreeBranch
        v-for="childNode in childNodes.data"
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
        <template #emptyNode="{ node }">
          <slot name="emptyNode" :node="node"></slot>
        </template>
      </TreeBranch>
    </div>

    <div
      v-if="childNodes.status === 'loading'"
      class="flex flex-1 flex-col items-center justify-center p-4"
    >
      <SmartSpinner class="my-4" />
      <span class="text-secondaryLight">{{ t("state.loading") }}</span>
    </div>
    <div
      v-if="childNodes.status === 'loaded' && childNodes.data.length === 0"
      class="flex flex-col flex-1"
    >
      <slot name="emptyNode" :node="nodeItem"></slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends any">
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { SmartTreeAdapter, TreeNode } from "~/helpers/tree/SmartTreeAdapter"

const props = defineProps<{
  /**
   * The node item that will be used to render the tree branch
   * @template T The type of the data passed to the tree branch
   */
  adapter: SmartTreeAdapter<T>
  /**
   *  The node item that will be used to render the tree branch content
   */
  nodeItem: TreeNode<T>
}>()

const CHILD_SLOT_NAME = "default"
const t = useI18n()

const showChildren = ref(false)
const isNodeOpen = ref(false)

/**
 * Fetch the child nodes from the adapter by passing the node id of the current node
 */
const childNodes = computed(
  () => props.adapter.getChildren(props.nodeItem.id).value
)

const toggleNodeChildren = () => {
  showChildren.value = !showChildren.value
  isNodeOpen.value = !isNodeOpen.value
}
</script>
