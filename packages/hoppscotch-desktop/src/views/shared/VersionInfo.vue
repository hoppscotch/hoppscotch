<template>
  <div class="text-secondaryLight text-sm mt-4 text-center">
    <p>Version {{ version }}</p>
    <p v-if="dataDirectory" class="text-xs mt-1">Data: {{ dataDirectory }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  version: string
  dataDirectory?: string
}

defineProps<Props>()
</script>
