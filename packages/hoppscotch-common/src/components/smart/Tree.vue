<template>
  <div class="flex flex-col">
    <div v-if="adapter.getChildren(null).length > 0" class="flex flex-col">
      <div v-for="rootNode in adapter.getChildren(null)" :key="rootNode.id">
        <SmartTreeBranch :node-item="rootNode" :adapter="adapter">
          <template #default="{ node, toggleChildren, isOpen }">
            <slot
              name="content"
              :node="node"
              :toggle-children="toggleChildren"
              :is-open="isOpen"
            ></slot>
          </template>
          <template #empty>
            <slot name="emptyRoot"></slot>
          </template>
        </SmartTreeBranch>
      </div>
    </div>
    <div v-else class="bg-orange-300">
      <slot name="emptyRoot"></slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends any">
import { SmartTreeAdapter } from "~/helpers/tree/SmartTreeAdapter"

defineProps<{
  adapter: SmartTreeAdapter<T>
}>()
</script>
