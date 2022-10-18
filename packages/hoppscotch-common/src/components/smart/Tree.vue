<template>
  <div class="flex flex-col gap-5">
    <div v-for="node in adapter.getChildren(null)" :key="node.id">
      <slot name="content" :node="node"> </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SmartTreeAdapter } from "~/helpers/tree/SmartTreeAdapter"

defineProps<{
  adapter: SmartTreeAdapter<any>
}>()
</script>
