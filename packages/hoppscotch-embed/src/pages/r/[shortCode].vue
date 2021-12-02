<template>
  <Request :short-code="props.shortCode" />
  <RequestOptions />
  <Response />
</template>

<script setup lang="ts">
const props = defineProps<{ shortCode: string }>()
</script>

<route lang="yaml">
meta:
  layout: embed
</route>
