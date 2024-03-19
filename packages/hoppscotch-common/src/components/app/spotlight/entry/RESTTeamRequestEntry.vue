<template>
  <span class="flex flex-1 items-center space-x-2">
    <template v-for="(title, index) in collectionTitles" :key="index">
      <span class="block" :class="{ truncate: index !== 0 }">
        {{ title }}
      </span>
      <icon-lucide-chevron-right class="flex flex-shrink-0" />
    </template>
    <span
      v-if="request"
      class="flex flex-shrink-0 truncate rounded-md border border-dividerDark px-1 text-tiny font-semibold"
      :style="{ color: getMethodLabelColor(request.method) }"
    >
      {{ request.method.toUpperCase() }}
    </span>
    <span v-if="request" class="block">
      {{ request.name }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { getMethodLabelColor } from "~/helpers/rest/labelColoring"

defineProps<{
  collectionTitles: string[]
  request: {
    name: string
    method: string
  }
}>()
</script>
