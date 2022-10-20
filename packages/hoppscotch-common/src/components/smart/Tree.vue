<template>
  <div class="flex flex-col gap-5">
    <div v-for="rootNode in adapter.getChildren(null)" :key="rootNode.id">
      <SmartTreeBranch :node="rootNode" :adapter="adapter">
        <template #default="{ node, toggleChildren }">
          <slot
            name="content"
            :node="node"
            :toggle-children="toggleChildren"
          ></slot>
        </template>
      </SmartTreeBranch>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends any">
import { SmartTreeAdapter } from "~/helpers/tree/SmartTreeAdapter"

defineProps<{
  adapter: SmartTreeAdapter<T>
}>()
</script>
